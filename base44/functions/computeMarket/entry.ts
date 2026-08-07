import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";

// Server-side authority for Market Analyzer derived values.
// The browser may keep instant calculations for UX, but only values
// produced here are trusted when a Market is saved. Reproduces the
// formulas in src/lib/marketMath.js exactly — do not change the math
// without changing both sides.

const num = (v, d = 0) => {
  if (v === "" || v === null || v === undefined || isNaN(Number(v))) return d;
  return Number(v);
};

const REGULATION = ["permitted", "restricted", "banned", "pending"];

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
  return 12;
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
    const regulation = body.regulation_status && REGULATION.includes(body.regulation_status)
      ? body.regulation_status
      : "pending";
    if (body.regulation_status && !REGULATION.includes(body.regulation_status)) {
      return bad("regulation_status must be permitted, restricted, banned or pending");
    }

    const compMedian = num(body.comp_revenue_median);
    const avgRent = num(body.average_market_rent);
    const adr = num(body.adr);
    const occPct = num(body.occupancy_rate);
    const activeListings = num(body.active_listings);
    const compCount = num(body.comp_count);

    if (compMedian < 0) return bad("comp_revenue_median cannot be negative");
    if (avgRent < 0) return bad("average_market_rent cannot be negative");
    if (adr < 0) return bad("adr cannot be negative");
    if (occPct < 0 || occPct > 100) return bad("occupancy_rate must be between 0 and 100");
    if (activeListings < 0) return bad("active_listings cannot be negative");
    if (compCount < 0) return bad("comp_count cannot be negative");

    // --- Calculate (mirrors analyzeMarket) ---
    const arbitrage_spread = Math.round(compMedian - avgRent);
    const spread_ratio = avgRent > 0 ? +(compMedian / avgRent).toFixed(2) : 0;

    const components = {
      adr: scoreAdr(adr),
      occupancy: scoreOcc(occPct),
      regulation: scoreReg(regulation),
      supply: scoreSupply(activeListings),
      spread: scoreSpread(spread_ratio)
    };

    let composite_score =
      components.adr +
      components.occupancy +
      components.regulation +
      components.supply +
      components.spread;
    const stale_data_flag = isStale(body.data_pulled_date);
    if (stale_data_flag) {
      composite_score = Math.max(0, composite_score - 10);
    }

    const thin_market_flag = compCount < 10;

    const spreadTier = spread_ratio < 2 ? 0 : spread_ratio <= 2.5 ? 1 : 2;
    const compTier = composite_score < 50 ? 0 : composite_score < 75 ? 1 : 2;
    let tier = Math.min(spreadTier, compTier);
    if (regulation === "banned" || regulation === "pending") tier = 0;
    const recommendation = tier === 2 ? "go" : tier === 1 ? "hold" : "no_go";

    return Response.json({
      arbitrage_spread,
      spread_ratio,
      composite_score,
      recommendation,
      stale_data_flag,
      thin_market_flag
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}