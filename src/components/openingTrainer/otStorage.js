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

  try {
    window.dispatchEvent(new Event("customreps:updated"));
  } catch (_) {
    // ignore
  }
}

export function makeCustomId() {
  return "custom-" + Date.now() + "-" + Math.floor(Math.random() * 1000000);
}

export function deleteCustomLineById(lineId) {
  const id = String(lineId || "");
  if (!id) return [];

  const next = loadCustomLines().filter((line) => {
    const currentId = String((line && line.id) || "");
    return currentId !== id;
  });

  saveCustomLines(next);
  return next;
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

  try {
    window.dispatchEvent(new Event("progress:updated"));
  } catch (_) {
    // ignore
  }
}

export function loadSettings(DEFAULT_THEME) {
  const defaults = {
    showConfetti: true,
    playSounds: true,
    allowTranspositions: false,
    boardTheme: DEFAULT_THEME,
    pieceTheme: "default",
    coachTheme: "default"
  };
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaults;
    const parsed = safeJsonParse(raw, defaults);
    if (!parsed || typeof parsed !== "object") return defaults;

    return {
      showConfetti: parsed.showConfetti !== false,
      playSounds: parsed.playSounds !== false,
      allowTranspositions: parsed.allowTranspositions === true,
      boardTheme: parsed.boardTheme || DEFAULT_THEME,
      pieceTheme: parsed.pieceTheme || "default",
      coachTheme: parsed.coachTheme || "default"
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
      totalClean: 0,
      prestigeCount: 0,
      lastPrestigedAt: null
    };
  }
  const o = progress.openings[openingKey];
  const t = todayKey();
  if (o.todayKey !== t) {
    o.todayKey = t;
    o.completedToday = 0;
    o.streak = 0;
  }
  if (typeof o.prestigeCount !== "number") o.prestigeCount = 0;
  if (!("lastPrestigedAt" in o)) o.lastPrestigedAt = null;
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

export function getOpeningPrestigeCount(progress, openingKey) {
  if (!progress || !openingKey) return 0;
  const opening = progress.openings && progress.openings[openingKey];
  return Math.max(0, Number(opening && opening.prestigeCount) || 0);
}

export function getOpeningCompletionSummary(progress, learnProgress, openingKey, lines) {
  const safeLines = Array.isArray(lines) ? lines : [];
  const progressLines = (progress && progress.lines && progress.lines[openingKey]) || {};
  const learnLines =
    (learnProgress &&
      learnProgress.openings &&
      learnProgress.openings[openingKey] &&
      learnProgress.openings[openingKey].lines) ||
    {};

  let completed = 0;

  for (let i = 0; i < safeLines.length; i += 1) {
    const line = safeLines[i];
    const lineId = line && line.id;
    if (!lineId) continue;

    const progressStats = progressLines[lineId] || {};
    const learnStats = learnLines[lineId] || {};

    if (isCompleted(progressStats) || isCompleted(learnStats)) {
      completed += 1;
    }
  }

  const total = safeLines.length;

  return {
    completed,
    total,
    remaining: Math.max(0, total - completed),
    isComplete: total > 0 && completed >= total,
    prestigeCount: getOpeningPrestigeCount(progress, openingKey)
  };
}

export function prestigeOpeningCourse(progress, learnProgress, openingKey, lines) {
  if (!progress || !learnProgress || !openingKey) {
    return {
      progress,
      learnProgress,
      prestigeCount: 0
    };
  }

  ensureOpening(progress, openingKey);
  ensureLearnOpening(learnProgress, openingKey);

  const safeLines = Array.isArray(lines) ? lines : [];
  const courseIds = new Set(
    safeLines
      .map((line) => String((line && line.id) || "").trim())
      .filter(Boolean)
  );

  const progressBucket = {
    ...((progress.lines && progress.lines[openingKey]) || {})
  };
  Object.keys(progressBucket).forEach((lineId) => {
    if (courseIds.has(String(lineId))) delete progressBucket[lineId];
  });
  progress.lines[openingKey] = progressBucket;

  const learnBucket = {
    ...((learnProgress.openings[openingKey] && learnProgress.openings[openingKey].lines) || {})
  };
  Object.keys(learnBucket).forEach((lineId) => {
    if (courseIds.has(String(lineId))) delete learnBucket[lineId];
  });
  learnProgress.openings[openingKey].lines = learnBucket;

  const now = Date.now();
  const opening = progress.openings[openingKey];
  opening.prestigeCount = (Number(opening.prestigeCount) || 0) + 1;
  opening.lastPrestigedAt = now;
  opening.lastPlayedAt = now;
  opening.completedToday = 0;
  opening.streak = 0;
  opening.todayKey = todayKey();

  learnProgress.openings[openingKey].lastPlayedAt = now;
  learnProgress.openings[openingKey].lastPrestigedAt = now;

  return {
    progress,
    learnProgress,
    prestigeCount: opening.prestigeCount
  };
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
    progress.openings[openingKey] = { lines: {}, lastPlayedAt: null, lastPrestigedAt: null };
  }
  if (!progress.openings[openingKey].lines) progress.openings[openingKey].lines = {};
  if (!("lastPrestigedAt" in progress.openings[openingKey])) progress.openings[openingKey].lastPrestigedAt = null;
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
