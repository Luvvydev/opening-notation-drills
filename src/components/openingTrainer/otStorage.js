import { safeJsonParse, todayKey } from "./otUtils";

export const STORAGE_KEY = "notation_trainer_opening_progress_v2";
export const LEARN_STORAGE_KEY = "notation_trainer_learn_progress_v1";
export const SETTINGS_KEY = "notation_trainer_opening_settings_v1";
export const CUSTOM_REPS_KEY = "notation_trainer_custom_lines_v1";

export function loadCustomLines() {
  try {
    const raw = window.localStorage.getItem(CUSTOM_REPS_KEY);
    if (!raw) return [];
    const parsed = safeJsonParse(raw, []);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

export function saveCustomLines(lines) {
  try {
    window.localStorage.setItem(CUSTOM_REPS_KEY, JSON.stringify(lines || []));
  } catch (_) {
    // ignore
  }
}

export function makeCustomId() {
  return "custom-" + Date.now() + "-" + Math.floor(Math.random() * 1000000);
}

export function loadProgress() {
  const empty = { lines: {}, openings: {} };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty;
    const parsed = safeJsonParse(raw, empty);
    if (!parsed || typeof parsed !== "object") return empty;
    if (!parsed.lines) parsed.lines = {};
    if (!parsed.openings) parsed.openings = {};
    return parsed;
  } catch (_) {
    return empty;
  }
}

export function saveProgress(progress) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (_) {
    // ignore
  }
}

export function loadSettings(DEFAULT_THEME) {
  const defaults = {
    showConfetti: true,
    playSounds: true,
    boardTheme: DEFAULT_THEME
  };
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaults;
    const parsed = safeJsonParse(raw, defaults);
    if (!parsed || typeof parsed !== "object") return defaults;

    return {
      showConfetti: parsed.showConfetti !== false,
      playSounds: parsed.playSounds !== false,
      boardTheme: parsed.boardTheme || DEFAULT_THEME
    };
  } catch (_) {
    return defaults;
  }
}

export function saveSettings(settings) {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (_) {
    // ignore
  }
}

export function ensureOpening(progress, openingKey) {
  if (!progress.lines[openingKey]) progress.lines[openingKey] = {};
  if (!progress.openings[openingKey]) {
    progress.openings[openingKey] = {
      streak: 0,
      bestStreak: 0,
      completedToday: 0,
      todayKey: todayKey(),
      totalCompleted: 0,
      totalClean: 0
    };
  }
  const o = progress.openings[openingKey];
  const t = todayKey();
  if (o.todayKey !== t) {
    o.todayKey = t;
    o.completedToday = 0;
    o.streak = 0;
  }
}

export function getLineStats(progress, openingKey, lineId) {
  ensureOpening(progress, openingKey);
  const bucket = progress.lines[openingKey];
  if (!bucket[lineId]) {
    bucket[lineId] = {
      timesSeen: 0,
      timesCompleted: 0,
      timesClean: 0,
      timesFailed: 0,
      lastResult: null,
      lastSeenAt: null,
      lastFailedAt: null
    };
  } else {
    // Backfill new fields for older saves.
    if (typeof bucket[lineId].timesFailed !== "number") bucket[lineId].timesFailed = 0;
    if (!("lastSeenAt" in bucket[lineId])) bucket[lineId].lastSeenAt = null;
    if (!("lastFailedAt" in bucket[lineId])) bucket[lineId].lastFailedAt = null;
  }
  return bucket[lineId];
}


export function loadLearnProgress() {
  try {
    const raw = window.localStorage.getItem(LEARN_STORAGE_KEY);
    if (!raw) return { openings: {} };
    const obj = safeJsonParse(raw, { openings: {} });
    if (!obj || typeof obj !== "object") return { openings: {} };
    if (!obj.openings || typeof obj.openings !== "object") obj.openings = {};
    return obj;
  } catch (_) {
    return { openings: {} };
  }
}

export function saveLearnProgress(progress) {
  try {
    window.localStorage.setItem(LEARN_STORAGE_KEY, JSON.stringify(progress || { openings: {} }));
  } catch (_) {}

  try {
    window.dispatchEvent(new Event("learnprogress:updated"));
  } catch (_) {}
}

export function ensureLearnOpening(progress, openingKey) {
  if (!progress.openings) progress.openings = {};
  if (!progress.openings[openingKey]) {
    progress.openings[openingKey] = { lines: {}, lastPlayedAt: null };
  }
  if (!progress.openings[openingKey].lines) progress.openings[openingKey].lines = {};
}

export function getLearnLineStats(progress, openingKey, lineId) {
  if (!progress || !openingKey || !lineId) {
    return {
      timesSeen: 0,
      timesCompleted: 0,
      timesClean: 0,
      timesFailed: 0,
      lastResult: "",
      lastSeenAt: null,
      lastFailedAt: null
    };
  }

  ensureLearnOpening(progress, openingKey);
  const bucket = progress.openings[openingKey].lines;

  if (!bucket[lineId]) {
    bucket[lineId] = {
      timesSeen: 0,
      timesCompleted: 0,
      timesClean: 0,
      timesFailed: 0,
      lastResult: "",
      lastSeenAt: null,
      lastFailedAt: null
    };
  }

  // backfill
  if (typeof bucket[lineId].timesSeen !== "number") bucket[lineId].timesSeen = 0;
  if (typeof bucket[lineId].timesCompleted !== "number") bucket[lineId].timesCompleted = 0;
  if (typeof bucket[lineId].timesClean !== "number") bucket[lineId].timesClean = 0;
  if (typeof bucket[lineId].timesFailed !== "number") bucket[lineId].timesFailed = 0;
  if (!("lastResult" in bucket[lineId])) bucket[lineId].lastResult = "";
  if (!("lastSeenAt" in bucket[lineId])) bucket[lineId].lastSeenAt = null;
  if (!("lastFailedAt" in bucket[lineId])) bucket[lineId].lastFailedAt = null;

  return bucket[lineId];
}

export function isCompleted(stats) {
  return (stats && stats.timesClean >= 1) || false;
}
