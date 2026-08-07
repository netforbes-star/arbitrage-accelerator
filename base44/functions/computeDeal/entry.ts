import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";

// Server-side authority for Deal Analyzer derived values.
// The browser may keep instant calculations for UX, but only values
// produced here are trusted when a Deal is saved. Reproduces the
// formulas in src/lib/dealMath.js exactly — do not change the math
// without changing both sides.

const DEFAULTS = {
  occupancy: 0.6,
  costRatio: 0.3,
  furnitureReserveRate: 0.05,
  maintenance: 100,
  managementRate: 20,
  managementHoursPerWeek: 5,
  profitFloor: 500,
  defaultHaircut: 0.15
};

const num = (v, d = 0) => {
  if (v === "" || v === null || v === undefined || isNaN(Number(v))) return d;
  return Number(v);
};

function bad(msg) {
  return Response.json({ error: msg }, { status: 400 });
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    // --- Validate raw inputs ---
    const mode = body.revenue_mode === "monthly" ? "monthly" : "nightly";
    if (body.revenue_mode && !["nightly", "monthly"].includes(body.revenue_mode)) {
      return bad("revenue_mode must be 'nightly' or 'monthly'");
    }

    const nightlyAdr = num(body.nightly_adr);
    const monthlyRaw = num(body.monthly_str_revenue);
    const occupancyRaw = body.occupancy;
    const occupancy =
      occupancyRaw !== "" && occupancyRaw !== null && occupancyRaw !== undefined
        ? num(occupancyRaw, DEFAULTS.occupancy)
        : DEFAULTS.occupancy;
    const haircutRaw = body.conservatism_haircut;
    const haircut =
      haircutRaw !== "" && haircutRaw !== null && haircutRaw !== undefined
        ? num(haircutRaw, DEFAULTS.defaultHaircut)
        : DEFAULTS.defaultHaircut;
    const rent = num(body.monthly_rent);
    const utilities = num(body.utilities);
    const furnishing = num(body.furnishing_cost);
    const mtrRev = num(body.mtr_revenue_estimate);

    if (nightlyAdr < 0) return bad("nightly_adr cannot be negative");
    if (monthlyRaw < 0) return bad("monthly_str_revenue cannot be negative");
    if (occupancy < 0 || occupancy > 1) return bad("occupancy must be between 0 and 1");
    if (haircut < 0 || haircut > 1) return bad("conservatism_haircut must be between 0 and 1");
    if (rent < 0) return bad("monthly_rent cannot be negative");
    if (utilities < 0) return bad("utilities cannot be negative");
    if (furnishing < 0) return bad("furnishing_cost cannot be negative");
    if (mtrRev < 0) return bad("mtr_revenue_estimate cannot be negative");

    // --- Calculate (mirrors analyzeDeal) ---
    let grossRevenue = 0;
    let haircutAmount = 0;
    if (mode === "monthly") {
      haircutAmount = monthlyRaw * haircut;
      grossRevenue = monthlyRaw - haircutAmount;
    } else {
      grossRevenue = nightlyAdr * occupancy * 30;
    }

    const variableCosts = DEFAULTS.costRatio * grossRevenue;
    const furnitureReserve = DEFAULTS.furnitureReserveRate * grossRevenue;
    const maintenance = DEFAULTS.maintenance;
    const managementValue =
      (DEFAULTS.managementRate * DEFAULTS.managementHoursPerWeek * 52) / 12;

    const cashProfit =
      grossRevenue - variableCosts - furnitureReserve - rent - utilities - maintenance;
    const trueProfit = cashProfit - managementValue;

    const margin = grossRevenue > 0 ? (cashProfit / grossRevenue) * 100 : 0;
    const monthsToRecoup = cashProfit > 0 ? furnishing / cashProfit : null;

    const mtrProfit = mtrRev - (rent + utilities + maintenance);
    const recommended =
      mtrProfit > cashProfit ? "Mid-Term Rental (MTR)" : "Short-Term Rental (STR)";

    const verdict = cashProfit >= DEFAULTS.profitFloor ? "PASS" : "FAIL";

    let failFix = "";
    if (verdict === "FAIL") {
      const shortfall = DEFAULTS.profitFloor - cashProfit;
      const rentCut = Math.max(0, shortfall);
      const netFactor = 1 - DEFAULTS.costRatio - DEFAULTS.furnitureReserveRate;
      const neededGross =
        netFactor > 0
          ? (DEFAULTS.profitFloor + rent + utilities + maintenance) / netFactor
          : 0;
      let fix = `To clear the $${DEFAULTS.profitFloor}/mo cash-profit floor you're $${Math.round(shortfall)}/mo short. Options:`;
      fix += `\n• Lower monthly rent by $${Math.round(rentCut)}/mo (to $${Math.max(0, Math.round(rent - rentCut))}/mo).`;
      if (mode === "nightly") {
        const neededAdr = occupancy > 0 ? neededGross / (occupancy * 30) : 0;
        fix += `\n• Raise your nightly ADR to $${Math.round(neededAdr)}/night (from $${Math.round(nightlyAdr)}).`;
      } else {
        const neededMonthly =
          haircut > 0 && haircut < 1 ? neededGross / (1 - haircut) : neededGross;
        fix += `\n• Raise your monthly revenue estimate to $${Math.round(neededMonthly)}/mo (from $${Math.round(monthlyRaw)}).`;
      }
      fix += `\n• Cut furnishing cost to free up cash flow.`;
      failFix = fix;
    }

    return Response.json({
      gross_revenue: Math.round(grossRevenue),
      haircut_amount: Math.round(haircutAmount),
      variable_costs: Math.round(variableCosts),
      furniture_reserve: Math.round(furnitureReserve),
      cash_profit: Math.round(cashProfit),
      true_profit: Math.round(trueProfit),
      profit_margin_pct: Math.round(margin),
      months_to_recoup: monthsToRecoup
        ? Math.round(monthsToRecoup * 10) / 10
        : null,
      recommended_strategy: recommended,
      verdict,
      fail_fix: failFix
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}