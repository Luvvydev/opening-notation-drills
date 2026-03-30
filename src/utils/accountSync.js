import { db, serverTimestamp } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

// LocalStorage keys used in your app
const LS_DAILY_STREAK_KEY = "chessdrills.daily_streak.v1";
const LS_PROGRESS_KEY = "notation_trainer_opening_progress_v2";
const LS_SETTINGS_KEY = "notation_trainer_opening_settings_v1";
const LS_CUSTOM_REPS_KEY = "notation_trainer_custom_lines_v1";
const LS_LEARN_PROGRESS_KEY = "notation_trainer_learn_progress_v1";
const LS_ACTIVITY_DAYS_KEY = "chessdrills.activity_days.v1";

function safeJsonParse(text, fallback) {
  try {
    return JSON.parse(text);
  } catch (_) {
    return fallback;
  }
}

function loadLS(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return safeJsonParse(raw, fallback);
  } catch (_) {
    return fallback;
  }
}

function saveLS(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (_) {}
}

function asObj(v) {
  return v && typeof v === "object" ? v : {};
}

function isYmd(s) {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function mergeDailyStreak(localRaw, remoteRaw) {
  const l = asObj(localRaw);
  const r = asObj(remoteRaw);

  const lLast = isYmd(l.lastCompletedDate) ? l.lastCompletedDate : null;
  const rLast = isYmd(r.lastCompletedDate) ? r.lastCompletedDate : null;

  const lBest = Number(l.best) || 0;
  const rBest = Number(r.best) || 0;

  const lCur = Number(l.current) || 0;
  const rCur = Number(r.current) || 0;

  let lastCompletedDate = null;
  let current = 0;

  // Pick the newer completion date if available
  if (lLast && rLast) {
    if (lLast > rLast) {
      lastCompletedDate = lLast;
      current = lCur;
    } else if (rLast > lLast) {
      lastCompletedDate = rLast;
      current = rCur;
    } else {
      lastCompletedDate = lLast;
      current = Math.max(lCur, rCur);
    }
  } else if (lLast) {
    lastCompletedDate = lLast;
    current = lCur;
  } else if (rLast) {
    lastCompletedDate = rLast;
    current = rCur;
  }

  const best = Math.max(lBest, rBest, current);

  return {
    current: current,
    best: best,
    lastCompletedDate: lastCompletedDate
  };
}

function mergeProgress(localRaw, remoteRaw) {
  const l = asObj(localRaw);
  const r = asObj(remoteRaw);

  const lLines = asObj(l.lines);
  const rLines = asObj(r.lines);
  const lOpenings = asObj(l.openings);
  const rOpenings = asObj(r.openings);

  const out = {
    lines: {},
    openings: {}
  };

  const openingKeys = new Set([
    ...Object.keys(lOpenings),
    ...Object.keys(rOpenings),
    ...Object.keys(lLines),
    ...Object.keys(rLines)
  ]);

  const normalizeLineStats = (stats, prestigeCutoff) => {
    const s = asObj(stats);
    const lastSeenAt = Number(s.lastSeenAt) || 0;
    const lastFailedAt = Number(s.lastFailedAt) || 0;
    const freshestAt = Math.max(lastSeenAt, lastFailedAt);
    const hasActivity =
      (Number(s.timesSeen) || 0) > 0 ||
      (Number(s.timesCompleted) || 0) > 0 ||
      (Number(s.timesClean) || 0) > 0 ||
      (Number(s.timesFailed) || 0) > 0;

    if (prestigeCutoff > 0 && hasActivity && freshestAt < prestigeCutoff) {
      return {};
    }

    return s;
  };

  openingKeys.forEach((openingKey) => {
    const aOpening = asObj(lOpenings[openingKey]);
    const bOpening = asObj(rOpenings[openingKey]);

    const mergedLastPrestigedAt =
      Math.max(Number(aOpening.lastPrestigedAt) || 0, Number(bOpening.lastPrestigedAt) || 0) || null;

    out.openings[openingKey] = {
      ...aOpening,
      ...bOpening,
      totalCompleted: Math.max(Number(aOpening.totalCompleted) || 0, Number(bOpening.totalCompleted) || 0),
      totalClean: Math.max(Number(aOpening.totalClean) || 0, Number(bOpening.totalClean) || 0),
      bestStreak: Math.max(Number(aOpening.bestStreak) || 0, Number(bOpening.bestStreak) || 0),
      prestigeCount: Math.max(Number(aOpening.prestigeCount) || 0, Number(bOpening.prestigeCount) || 0),
      lastPrestigedAt: mergedLastPrestigedAt,
      // These are volatile day-by-day; keep the local day context if present
      todayKey: aOpening.todayKey || bOpening.todayKey || null,
      completedToday: Number(aOpening.completedToday) || 0,
      streak: Number(aOpening.streak) || 0
    };

    const outBucket = {};
    const lineIds = new Set([
      ...Object.keys(asObj(lLines[openingKey])),
      ...Object.keys(asObj(rLines[openingKey]))
    ]);

    lineIds.forEach((lineId) => {
      const a = normalizeLineStats(asObj(lLines[openingKey])[lineId], Number(mergedLastPrestigedAt) || 0);
      const b = normalizeLineStats(asObj(rLines[openingKey])[lineId], Number(mergedLastPrestigedAt) || 0);

      const aSeenAt = Math.max(Number(a.lastSeenAt) || 0, Number(a.lastFailedAt) || 0);
      const bSeenAt = Math.max(Number(b.lastSeenAt) || 0, Number(b.lastFailedAt) || 0);

      const merged = {
        timesSeen: Math.max(Number(a.timesSeen) || 0, Number(b.timesSeen) || 0),
        timesCompleted: Math.max(Number(a.timesCompleted) || 0, Number(b.timesCompleted) || 0),
        timesClean: Math.max(Number(a.timesClean) || 0, Number(b.timesClean) || 0),
        timesFailed: Math.max(Number(a.timesFailed) || 0, Number(b.timesFailed) || 0),
        lastResult: aSeenAt >= bSeenAt ? (a.lastResult || null) : (b.lastResult || null),
        lastSeenAt: Math.max(Number(a.lastSeenAt) || 0, Number(b.lastSeenAt) || 0) || null,
        lastFailedAt: Math.max(Number(a.lastFailedAt) || 0, Number(b.lastFailedAt) || 0) || null
      };

      if (merged.timesSeen || merged.timesCompleted || merged.timesClean || merged.timesFailed) {
        outBucket[lineId] = merged;
      }
    });

    out.lines[openingKey] = outBucket;
  });

  return out;
}


function mergeLearnProgress(localRaw, remoteRaw) {
  const l = asObj(localRaw);
  const r = asObj(remoteRaw);

  const out = { openings: {} };

  const lOpenings = asObj(l.openings);
  const rOpenings = asObj(r.openings);

  const keys = new Set([...Object.keys(rOpenings), ...Object.keys(lOpenings)]);
  keys.forEach((openingKey) => {
    const lo = asObj(lOpenings[openingKey]);
    const ro = asObj(rOpenings[openingKey]);

    const lastPrestigedAt =
      Math.max(Number(lo.lastPrestigedAt) || 0, Number(ro.lastPrestigedAt) || 0) || null;

    const outOpening = {
      lines: {},
      lastPlayedAt: null,
      lastPrestigedAt
    };

    // Prefer the latest lastPlayedAt timestamp (or keep null)
    const lLast = lo.lastPlayedAt ? Number(lo.lastPlayedAt) : null;
    const rLast = ro.lastPlayedAt ? Number(ro.lastPlayedAt) : null;
    if (lLast != null || rLast != null) {
      if (lLast == null) outOpening.lastPlayedAt = rLast;
      else if (rLast == null) outOpening.lastPlayedAt = lLast;
      else outOpening.lastPlayedAt = Math.max(lLast, rLast);
    }

    const normalizeLineStats = (stats) => {
      const s = asObj(stats);
      const freshestAt = Math.max(Number(s.lastSeenAt) || 0, Number(s.lastFailedAt) || 0);
      const hasActivity =
        (Number(s.timesSeen) || 0) > 0 ||
        (Number(s.timesCompleted) || 0) > 0 ||
        (Number(s.timesClean) || 0) > 0 ||
        (Number(s.timesFailed) || 0) > 0;

      if ((Number(lastPrestigedAt) || 0) > 0 && hasActivity && freshestAt < Number(lastPrestigedAt)) {
        return {};
      }

      return s;
    };

    const lLines = asObj(lo.lines);
    const rLines = asObj(ro.lines);
    const lineIds = new Set([...Object.keys(rLines), ...Object.keys(lLines)]);

    lineIds.forEach((lineId) => {
      const a = normalizeLineStats(rLines[lineId]);
      const b = normalizeLineStats(lLines[lineId]);

      const merged = {
        timesSeen: Math.max(Number(a.timesSeen) || 0, Number(b.timesSeen) || 0),
        timesCompleted: Math.max(Number(a.timesCompleted) || 0, Number(b.timesCompleted) || 0),
        timesClean: Math.max(Number(a.timesClean) || 0, Number(b.timesClean) || 0),
        timesFailed: Math.max(Number(a.timesFailed) || 0, Number(b.timesFailed) || 0),
        lastResult: (Number(b.lastSeenAt) || 0) > (Number(a.lastSeenAt) || 0) ? (b.lastResult || "") : (a.lastResult || ""),
        lastSeenAt: Math.max(Number(a.lastSeenAt) || 0, Number(b.lastSeenAt) || 0) || null,
        lastFailedAt: Math.max(Number(a.lastFailedAt) || 0, Number(b.lastFailedAt) || 0) || null
      };

      if (merged.timesSeen || merged.timesCompleted || merged.timesClean || merged.timesFailed) {
        outOpening.lines[lineId] = merged;
      }
    });

    out.openings[openingKey] = outOpening;
  });

  return out;
}

function mergeCustomReps(localRaw, remoteRaw) {
  const l = Array.isArray(localRaw) ? localRaw : [];
  const r = Array.isArray(remoteRaw) ? remoteRaw : [];

  const map = {};

  // Prefer local first, then fill missing from remote
  for (const item of l) {
    if (!item || !item.id) continue;
    map[item.id] = item;
  }
  for (const item of r) {
    if (!item || !item.id) continue;
    if (!map[item.id]) map[item.id] = item;
  }

  return Object.values(map);
}

function mergeActivityDays(localRaw, remoteRaw) {
  const l = asObj(localRaw);
  const r = asObj(remoteRaw);

  const out = { ...r };
  Object.keys(l).forEach((k) => {
    const a = Number(out[k]) || 0;
    const b = Number(l[k]) || 0;
    out[k] = Math.max(a, b);
  });

  return out;
}

function mergeSettings(localRaw, remoteRaw) {
  const l = asObj(localRaw);
  const r = asObj(remoteRaw);

  // If remote exists, prefer it. Otherwise keep local.
  const rHasAny = Object.keys(r).length > 0;
  return rHasAny ? r : l;
}

export async function syncAccountFromLocalAndCloud(user) {
  if (!user || !user.uid) return null;

  const uid = user.uid;
  const ref = doc(db, "users", uid);

  // Load local snapshots
  const localDailyStreak = loadLS(LS_DAILY_STREAK_KEY, { current: 0, best: 0, lastCompletedDate: null });
  const localProgress = loadLS(LS_PROGRESS_KEY, { lines: {}, openings: {} });
  const localSettings = loadLS(LS_SETTINGS_KEY, {});
  const localCustomReps = loadLS(LS_CUSTOM_REPS_KEY, []);
  const localLearnProgress = loadLS(LS_LEARN_PROGRESS_KEY, { openings: {} });
  const localActivityDays = loadLS(LS_ACTIVITY_DAYS_KEY, {});

  // Load remote
  const snap = await getDoc(ref);
  const remote = snap.exists() ? asObj(snap.data()) : {};

  const remoteDailyStreak = asObj(remote.dailyStreak);
  const remoteProgress = asObj(remote.progress);
  const remoteSettings = asObj(remote.settings);
  const remoteCustomReps = Array.isArray(remote.customReps) ? remote.customReps : [];
  const remoteLearnProgress = asObj(remote.learnProgress);
  const remoteActivityDays = asObj(remote.activityDays);

  // Merge
  const mergedDailyStreak = mergeDailyStreak(localDailyStreak, remoteDailyStreak);
  const mergedProgress = mergeProgress(localProgress, remoteProgress);
  const mergedSettings = mergeSettings(localSettings, remoteSettings);
  const mergedCustomReps = mergeCustomReps(localCustomReps, remoteCustomReps);
  const mergedLearnProgress = mergeLearnProgress(localLearnProgress, remoteLearnProgress);
  const mergedActivityDays = mergeActivityDays(localActivityDays, remoteActivityDays);

  // Write merged back to local
  saveLS(LS_DAILY_STREAK_KEY, mergedDailyStreak);
  saveLS(LS_PROGRESS_KEY, mergedProgress);
  saveLS(LS_SETTINGS_KEY, mergedSettings);
  saveLS(LS_CUSTOM_REPS_KEY, mergedCustomReps);
  saveLS(LS_LEARN_PROGRESS_KEY, mergedLearnProgress);
  saveLS(LS_ACTIVITY_DAYS_KEY, mergedActivityDays);

  // Update remote (also store profile fields here)
  const displayName = user.displayName || "";
  const email = user.email || "";

  await setDoc(
    ref,
    {
      uid: uid,
      email: email,
      displayName: displayName,
      dailyStreak: mergedDailyStreak,
      progress: mergedProgress,
      settings: mergedSettings,
      customReps: mergedCustomReps,
      learnProgress: mergedLearnProgress,
      activityDays: mergedActivityDays,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );

  return {
    dailyStreak: mergedDailyStreak,
    progress: mergedProgress,
    settings: mergedSettings,
    customReps: mergedCustomReps
  };
}