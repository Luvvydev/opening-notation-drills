// src/utils/streak.js
const LS_KEY = "chessdrills.daily_streak.v1";

function pad2(n) {
  return String(n).padStart(2, "0");
}

// Local date key YYYY-MM-DD
export function ymdLocal(date = new Date()) {
  const y = date.getFullYear();
  const m = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  return `${y}-${m}-${d}`;
}

function addDaysLocal(ymd, deltaDays) {
  const [y, m, d] = String(ymd || "").split("-").map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  dt.setDate(dt.getDate() + deltaDays);
  return ymdLocal(dt);
}

function loadRaw() {
  try {
    const s = window.localStorage.getItem(LS_KEY);
    if (!s) return null;
    return JSON.parse(s);
  } catch (_) {
    return null;
  }
}

function saveRaw(obj) {
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(obj));
  } catch (_) {
    // ignore
  }
}

function notifyUpdated(detail) {
  try {
    window.dispatchEvent(new CustomEvent("streak:updated", { detail }));
  } catch (_) {
    // ignore
  }
}

export function getStreakState() {
  const today = ymdLocal();
  const raw = loadRaw();

  if (!raw || typeof raw !== "object") {
    return {
      current: 0,
      best: 0,
      lastCompletedDate: null,
      completedToday: false,
      today: today
    };
  }

  const last = raw.lastCompletedDate || null;
  const current = Number(raw.current) || 0;
  const best = Number(raw.best) || 0;

  return {
    current: current,
    best: best,
    lastCompletedDate: last,
    completedToday: last === today,
    today: today
  };
}

function weekdayNameLocal(date = new Date()) {
  try {
    return date.toLocaleDateString(undefined, { weekday: "long" });
  } catch (_) {
    // fallback
    const names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return names[date.getDay()] || "Today";
  }
}

// Use this when you need to know if we should show a "streak popup".
// Returns:
// - state: latest streak state after the operation
// - didMarkToday: true only on the first completed line of the day
// - continued: true if today continued yesterday's streak
// - newBest: true if best streak increased
export function markLineCompletedTodayDetailed() {
  const today = ymdLocal();
  const before = getStreakState();

  // Already counted today, do nothing
  if (before.completedToday) {
    return {
      state: before,
      didMarkToday: false,
      continued: false,
      newBest: false
    };
  }

  const raw = loadRaw() || {
    current: 0,
    best: 0,
    lastCompletedDate: null
  };

  const yesterday = addDaysLocal(today, -1);

  let nextCurrent = 1;
  const continued = raw.lastCompletedDate === yesterday;
  if (continued) {
    nextCurrent = (Number(raw.current) || 0) + 1;
  }

  const nextBest = Math.max(Number(raw.best) || 0, nextCurrent);
  const newBest = nextBest > (Number(raw.best) || 0);

  const next = {
    current: nextCurrent,
    best: nextBest,
    lastCompletedDate: today
  };

  saveRaw(next);

  const after = getStreakState();
  const detail = {
    current: after.current,
    best: after.best,
    continued: continued,
    newBest: newBest,
    today: after.today,
    weekday: weekdayNameLocal(new Date())
  };

  notifyUpdated(detail);

  return {
    state: after,
    didMarkToday: true,
    continued: continued,
    newBest: newBest
  };
}

// Backward compatible helper if you already used this name elsewhere.
export function markLineCompletedToday() {
  return markLineCompletedTodayDetailed().state;
}

// Testing helper
export function resetStreak() {
  try {
    window.localStorage.removeItem(LS_KEY);
  } catch (_) {
    // ignore
  }
  notifyUpdated({
    current: 0,
    best: 0,
    continued: false,
    newBest: false,
    today: ymdLocal(),
    weekday: weekdayNameLocal(new Date())
  });
}
