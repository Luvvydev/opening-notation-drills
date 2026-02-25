// src/utils/periodKeys.js
// Keys are used to scope leaderboard docs so daily/weekly/monthly boards actually reset.

export function dayKeyFromDate(dt = new Date()) {
  const d = new Date(dt);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ISO week, Monday-based, matches "reset every Monday"
export function isoWeekKeyFromDate(dt = new Date()) {
  const d = new Date(Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate()));
  // Thursday in current week decides the year.
  const dayNum = d.getUTCDay() || 7; // 1..7 (Mon..Sun)
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  const y = d.getUTCFullYear();
  const w = String(weekNo).padStart(2, "0");
  return `${y}-W${w}`;
}

export function monthKeyFromDate(dt = new Date()) {
  const d = new Date(dt);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function leaderboardScopeKey(period, dt = new Date()) {
  if (period === "day") return dayKeyFromDate(dt);
  if (period === "week") return isoWeekKeyFromDate(dt);
  if (period === "month") return monthKeyFromDate(dt);
  return "all";
}
