// Deal Analyzer — two explicit revenue modes, cash profit vs true profit.
// PASS/FAIL is tested against CASH PROFIT at the $500/month floor.

export const DEFAULTS = {
  occupancy: 0.6,
  costRatio: 0.3, // cleaning, supplies, platform fees
  furnitureReserveRate: 0.05,
  maintenance: 100,
  managementRate: 20,
  managementHoursPerWeek: 5,
  profitFloor: 500,
  defaultHaircut: 0.15
};

const num = (v, d = 0) => (v === "" || v == null || isNaN(Number(v)) ? d : Number(v));

export function analyzeDeal(input) {
  const mode = input.revenue_mode || "nightly";
  const occupancy = input.occupancy != null && input.occupancy !== "" ? num(input.occupancy, DEFAULTS.occupancy) : DEFAULTS.occupancy;
  const nightlyAdr = num(input.nightly_adr);
  const monthlyRaw = num(input.monthly_str_revenue);
  const haircut = input.conservatism_haircut != null && input.conservatism_haircut !== "" ? num(input.conservatism_haircut, DEFAULTS.defaultHaircut) : DEFAULTS.defaultHaircut;
  const rent = num(input.monthly_rent);
  const utilities = num(input.utilities);
  const furnishing = num(input.furnishing_cost);
  const mtrRev = num(input.mtr_revenue_estimate);

  let grossRevenue = 0;
  let haircutAmount = 0;
  const haircutApplied = mode === "monthly";

  if (mode === "monthly") {
    haircutAmount = monthlyRaw * haircut;
    grossRevenue = monthlyRaw - haircutAmount;
  } else {
    grossRevenue = nightlyAdr * occupancy * 30;
  }

  const variableCosts = DEFAULTS.costRatio * grossRevenue;
  const furnitureReserve = DEFAULTS.furnitureReserveRate * grossRevenue;
  const maintenance = DEFAULTS.maintenance;
  const managementValue = (DEFAULTS.managementRate * DEFAULTS.managementHoursPerWeek * 52) / 12;

  const cashProfit = grossRevenue - variableCosts - furnitureReserve - rent - utilities - maintenance;
  const trueProfit = cashProfit - managementValue;

  const margin = grossRevenue > 0 ? (cashProfit / grossRevenue) * 100 : 0;
  const monthsToRecoup = cashProfit > 0 ? furnishing / cashProfit : null;

  // MTR comparison (lower turnover, no nightly platform fees)
  const mtrProfit = mtrRev - (rent + utilities + maintenance);
  const recommended = mtrProfit > cashProfit ? "Mid-Term Rental (MTR)" : "Short-Term Rental (STR)";

  const verdict = cashProfit >= DEFAULTS.profitFloor ? "PASS" : "FAIL";

  let failFix = "";
  if (verdict === "FAIL") {
    const shortfall = DEFAULTS.profitFloor - cashProfit;
    const rentCut = Math.max(0, shortfall);
    const netFactor = 1 - DEFAULTS.costRatio - DEFAULTS.furnitureReserveRate;
    const neededGross = netFactor > 0 ? (DEFAULTS.profitFloor + rent + utilities + maintenance) / netFactor : 0;
    let fix = `To clear the $${DEFAULTS.profitFloor}/mo cash-profit floor you're $${Math.round(shortfall)}/mo short. Options:`;
    fix += `\n• Lower monthly rent by $${Math.round(rentCut)}/mo (to $${Math.max(0, Math.round(rent - rentCut))}/mo).`;
    if (mode === "nightly") {
      const neededAdr = occupancy > 0 ? neededGross / (occupancy * 30) : 0;
      fix += `\n• Raise your nightly ADR to $${Math.round(neededAdr)}/night (from $${Math.round(nightlyAdr)}).`;
    } else {
      const neededMonthly = haircut > 0 && haircut < 1 ? neededGross / (1 - haircut) : neededGross;
      fix += `\n• Raise your monthly revenue estimate to $${Math.round(neededMonthly)}/mo (from $${Math.round(monthlyRaw)}).`;
    }
    fix += `\n• Cut furnishing cost to free up cash flow.`;
    failFix = fix;
  }

  const timeWarning = verdict === "PASS" && trueProfit < 0;

  return {
    mode,
    grossRevenue,
    haircutAmount,
    haircutApplied,
    haircut,
    variableCosts,
    furnitureReserve,
    maintenance,
    managementValue,
    cashProfit,
    trueProfit,
    margin,
    monthsToRecoup,
    mtrProfit,
    recommended,
    verdict,
    failFix,
    timeWarning
  };
}

export const DEAL_STATUSES = ["evaluating", "outreach sent", "negotiating", "lease signed", "passed", "lost"];

/**
 * Host-facing labels for deal status.
 *
 * The stored values are the contract with the backend and never change. But
 * "passed" is genuinely ambiguous on screen: a host looking at a PASS verdict
 * reads "passed" as "this deal passed underwriting", when it means the opposite
 * — the host passed ON the deal and declined it. Spell that out.
 */
export const DEAL_STATUS_LABELS = {
  "evaluating": "Evaluating",
  "outreach sent": "Outreach sent",
  "negotiating": "Negotiating",
  "lease signed": "Lease signed",
  "passed": "I passed on this deal",
  "lost": "Lost — landlord declined"
};

/** Short label for badges and dense lists. */
export const DEAL_STATUS_SHORT_LABELS = {
  "evaluating": "Evaluating",
  "outreach sent": "Outreach sent",
  "negotiating": "Negotiating",
  "lease signed": "Lease signed",
  "passed": "I passed",
  "lost": "Lost"
};

export const dealStatusLabel = (s) => DEAL_STATUS_LABELS[s] || s;
export const dealStatusShortLabel = (s) => DEAL_STATUS_SHORT_LABELS[s] || s;