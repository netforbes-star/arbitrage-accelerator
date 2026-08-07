// Deal Analyzer — conservative-by-default underwriting engine.
// Locked assumptions are overridden only when the host supplies a logged reason.

export const DEFAULTS = {
  occupancy: 0.6,
  adr: 120,
  costRatio: 0.3,
  furnitureReserveRate: 0.05,
  maintenance: 100,
  managementRate: 20, // $/hr
  managementHoursPerWeek: 5,
  profitFloor: 500
};

export function analyzeDeal(input) {
  const rent = Number(input.monthly_rent) || 0;
  const utilities = Number(input.utilities) || 0;
  const furnishing = Number(input.furnishing_cost) || 0;
  const strRev = Number(input.str_revenue_estimate) || 0;
  const mtrRev = Number(input.mtr_revenue_estimate) || 0;

  const hasOccOverride = input.occupancy_override != null && input.occupancy_override !== "";
  const occupancy = hasOccOverride ? Number(input.occupancy_override) : DEFAULTS.occupancy;

  const compAdr = strRev > 0 ? strRev / 30 : Infinity;
  const hasAdrOverride = input.adr_override != null && input.adr_override !== "";
  let adr = hasAdrOverride ? Number(input.adr_override) : Math.min(DEFAULTS.adr, compAdr);
  if (!isFinite(adr) || adr <= 0) adr = DEFAULTS.adr;

  const hasCostOverride = input.cost_ratio_override != null && input.cost_ratio_override !== "";
  const costRatio = hasCostOverride ? Number(input.cost_ratio_override) : DEFAULTS.costRatio;

  const grossStr = adr * occupancy * 30;
  const turnoverFees = costRatio * grossStr;
  const furnitureReserve = DEFAULTS.furnitureReserveRate * grossStr;
  const maintenance = DEFAULTS.maintenance;
  const management = (DEFAULTS.managementRate * DEFAULTS.managementHoursPerWeek * 52) / 12;

  const fixedCosts = rent + utilities + maintenance + management;
  const allInCost = fixedCosts + turnoverFees + furnitureReserve;

  const strProfit = grossStr - allInCost;
  // MTR: far less turnover, no nightly platform fees, minimal furniture reserve
  const mtrAllIn = rent + utilities + maintenance + management;
  const mtrProfit = mtrRev - mtrAllIn;

  const strMargin = grossStr > 0 ? (strProfit / grossStr) * 100 : 0;
  const monthsToRecoup = strProfit > 0 ? furnishing / strProfit : null;

  const recommended = mtrProfit > strProfit ? "Mid-Term Rental (MTR)" : "Short-Term Rental (STR)";
  const bestProfit = Math.max(strProfit, mtrProfit);
  const verdict = bestProfit >= DEFAULTS.profitFloor ? "PASS" : "FAIL";

  let failFix = "";
  if (verdict === "FAIL") {
    const shortfall = DEFAULTS.profitFloor - bestProfit;
    const rentCut = Math.max(0, shortfall);
    const netFactor = 1 - costRatio - DEFAULTS.furnitureReserveRate;
    const neededGross = netFactor > 0 ? (DEFAULTS.profitFloor + fixedCosts) / netFactor : 0;
    failFix =
      `To clear the $${DEFAULTS.profitFloor}/mo floor you'd need to either lower monthly rent by $${Math.round(
        rentCut
      )}/mo (to $${Math.max(0, Math.round(rent - rentCut))}/mo), raise your STR revenue estimate to $${Math.round(
        neededGross
      )}/mo, or cut furnishing cost. You're $${Math.round(
        shortfall
      )}/mo short right now — this is the app doing its job and saving you from a deal that would lose money.`;
  }

  return {
    adr,
    occupancy,
    grossStr,
    turnoverFees,
    furnitureReserve,
    maintenance,
    management,
    fixedCosts,
    allInCost,
    strProfit,
    mtrProfit,
    strMargin,
    monthsToRecoup,
    recommended,
    verdict,
    failFix,
    usingOverrides: hasAdrOverride || hasOccOverride || hasCostOverride
  };
}

export const DEAL_STATUSES = [
  "evaluating",
  "outreach sent",
  "negotiating",
  "lease signed",
  "passed",
  "lost"
];