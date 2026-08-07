// Curriculum metadata + helpers. Full daily task content is seeded into the
// ProgramDay entity (admin-editable) and loaded at runtime; this file is the
// lightweight fallback and shared utilities.

export const WEEK_THEMES = {
  1: "Market Selection & Buy Box",
  2: "Landlord Sourcing Engine",
  3: "Underwrite & Negotiate",
  4: "Sign, Set Up & Launch"
};

export const WEEK_BLURBS = {
  1: "Lock down a market and a buy box worth fighting for.",
  2: "Build a landlord pipeline that runs whether or not you feel like it.",
  3: "Underwrite real deals and negotiate from a position of strength.",
  4: "Sign, set up, and launch your first arbitrage property."
};

export const GATE_DAYS = [1, 3, 5, 8, 12, 16, 20];

export function dayDate(startDateStr, day) {
  if (!startDateStr) return "";
  const start = new Date(startDateStr + "T00:00:00");
  const d = new Date(start.getTime() + (day - 1) * 86400000);
  return d.toISOString().slice(0, 10);
}

export function getCurrentDay(startDateStr) {
  if (!startDateStr) return 1;
  const start = new Date(startDateStr + "T00:00:00");
  const now = new Date();
  const diff = Math.floor((now - start) / 86400000) + 1;
  return Math.min(28, Math.max(1, diff));
}

export function daysRemaining(startDateStr) {
  if (!startDateStr) return 28;
  return Math.max(0, 28 - getCurrentDay(startDateStr) + 1);
}

// Gate days per week: returns the gate day numbers belonging to a given week.
export function gatesForWeek(week) {
  return GATE_DAYS.filter((d) => Math.ceil(d / 7) === week);
}