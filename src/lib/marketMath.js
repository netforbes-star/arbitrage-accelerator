// Market Analyzer — composite scoring across five components.

const num = (v, d = 0) => (v === "" || v == null || isNaN(Number(v)) ? d : Number(v));

function scoreAdr(adr) {
  if (adr >= 150) return 20;
  if (adr >= 120) return 17;
  if (adr >= 90) return 13;
  if (adr >= 60) return 8;
  return 4;
}
function scoreOcc(occ) {
  if (occ >= 70) return 20;
  if (occ >= 60) return 16;
  if (occ >= 50) return 11;
  if (occ >= 40) return 6;
  return 3;
}
function scoreReg(reg) {
  if (reg === "permitted") return 20;
  if (reg === "restricted") return 10;
  if (reg === "pending") return 5;
  return 0;
}
function scoreSupply(listings) {
  if (listings >= 50 && listings <= 500) return 20;
  if (listings > 500 && listings <= 1500) return 15;
  if (listings > 1500 && listings <= 3000) return 10;
  if (listings > 3000) return 6;
  return 12; // under 50 — thin but not oversupplied
}
function scoreSpread(ratio) {
  if (ratio >= 2.5) return 20;
  if (ratio >= 2) return 16;
  if (ratio >= 1.5) return 11;
  if (ratio >= 1) return 6;
  return 3;
}

function isStale(dateStr) {
  if (!dateStr) return false;
  const pulled = new Date(dateStr + "T00:00:00");
  if (isNaN(pulled.getTime())) return false;
  const days = (Date.now() - pulled.getTime()) / 86400000;
  return days > 180;
}

export function analyzeMarket(input) {
  const compMedian = num(input.comp_revenue_median);
  const avgRent = num(input.average_market_rent);
  const adr = num(input.adr);
  const occPct = num(input.occupancy_rate);
  const activeListings = num(input.active_listings);
  const compCount = num(input.comp_count);
  const regulation = input.regulation_status || "pending";

  const arbitrage_spread = Math.round(compMedian - avgRent);
  const spread_ratio = avgRent > 0 ? +(compMedian / avgRent).toFixed(2) : 0;

  const components = {
    adr: scoreAdr(adr),
    occupancy: scoreOcc(occPct),
    regulation: scoreReg(regulation),
    supply: scoreSupply(activeListings),
    spread: scoreSpread(spread_ratio)
  };

  let composite_score = components.adr + components.occupancy + components.regulation + components.supply + components.spread;
  const stale_data_flag = isStale(input.data_pulled_date);
  let staleDeduction = 0;
  if (stale_data_flag) {
    staleDeduction = 10;
    composite_score = Math.max(0, composite_score - 10);
  }

  const thin_market_flag = compCount < 10;

  const spreadTier = spread_ratio < 2 ? 0 : spread_ratio <= 2.5 ? 1 : 2;
  const compTier = composite_score < 50 ? 0 : composite_score < 75 ? 1 : 2;
  let tier = Math.min(spreadTier, compTier);
  // Regulation override — non-negotiable.
  if (regulation === "banned" || regulation === "pending") tier = 0;
  const recommendation = tier === 2 ? "go" : tier === 1 ? "hold" : "no_go";

  return {
    arbitrage_spread,
    spread_ratio,
    components,
    composite_score,
    stale_data_flag,
    staleDeduction,
    thin_market_flag,
    recommendation,
    regulation_forced_no_go: regulation === "banned" || regulation === "pending"
  };
}

export const REGULATION_STATUSES = ["permitted", "restricted", "banned", "pending"];