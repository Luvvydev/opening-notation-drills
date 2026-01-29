import { db, serverTimestamp } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

// LocalStorage keys used in your app
const LS_DAILY_STREAK_KEY = "chessdrills.daily_streak.v1";
const LS_PROGRESS_KEY = "notation_trainer_opening_progress_v2";
const LS_SETTINGS_KEY = "notation_trainer_opening_settings_v1";
const LS_CUSTOM_REPS_KEY = "notation_trainer_custom_lines_v1";
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

  const out = {
    lines: asObj(l.lines),
    openings: asObj(l.openings)
  };

  // Merge line stats by max counters
  const rLines = asObj(r.lines);
  Object.keys(rLines).forEach((openingKey) => {
    if (!out.lines[openingKey]) out.lines[openingKey] = {};
    const bucket = asObj(rLines[openingKey]);

    Object.keys(bucket).forEach((lineId) => {
      const a = asObj(out.lines[openingKey][lineId]);
      const b = asObj(bucket[lineId]);

      const merged = {
        timesSeen: Math.max(Number(a.timesSeen) || 0, Number(b.timesSeen) || 0),
        timesCompleted: Math.max(Number(a.timesCompleted) || 0, Number(b.timesCompleted) || 0),
        timesClean: Math.max(Number(a.timesClean) || 0, Number(b.timesClean) || 0),
        lastResult:
          (Number(a.timesCompleted) || 0) >= (Number(b.timesCompleted) || 0)
            ? (a.lastResult || null)
            : (b.lastResult || null)
      };

      out.lines[openingKey][lineId] = merged;
    });
  });

  // Merge per-opening totals and best streaks
  const rOpenings = asObj(r.openings);
  Object.keys(rOpenings).forEach((openingKey) => {
    const a = asObj(out.openings[openingKey]);
    const b = asObj(rOpenings[openingKey]);

    out.openings[openingKey] = {
      ...a,
      ...b,
      totalCompleted: Math.max(Number(a.totalCompleted) || 0, Number(b.totalCompleted) || 0),
      totalClean: Math.max(Number(a.totalClean) || 0, Number(b.totalClean) || 0),
      bestStreak: Math.max(Number(a.bestStreak) || 0, Number(b.bestStreak) || 0),
      // These are volatile day-by-day; keep the local day context if present
      todayKey: a.todayKey || b.todayKey || null,
      completedToday: Number(a.completedToday) || 0,
      streak: Number(a.streak) || 0
    };
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
  const localActivityDays = loadLS(LS_ACTIVITY_DAYS_KEY, {});

  // Load remote
  const snap = await getDoc(ref);
  const remote = snap.exists() ? asObj(snap.data()) : {};

  const remoteDailyStreak = asObj(remote.dailyStreak);
  const remoteProgress = asObj(remote.progress);
  const remoteSettings = asObj(remote.settings);
  const remoteCustomReps = Array.isArray(remote.customReps) ? remote.customReps : [];
  const remoteActivityDays = asObj(remote.activityDays);

  // Merge
  const mergedDailyStreak = mergeDailyStreak(localDailyStreak, remoteDailyStreak);
  const mergedProgress = mergeProgress(localProgress, remoteProgress);
  const mergedSettings = mergeSettings(localSettings, remoteSettings);
  const mergedCustomReps = mergeCustomReps(localCustomReps, remoteCustomReps);
  const mergedActivityDays = mergeActivityDays(localActivityDays, remoteActivityDays);

  // Write merged back to local
  saveLS(LS_DAILY_STREAK_KEY, mergedDailyStreak);
  saveLS(LS_PROGRESS_KEY, mergedProgress);
  saveLS(LS_SETTINGS_KEY, mergedSettings);
  saveLS(LS_CUSTOM_REPS_KEY, mergedCustomReps);
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
