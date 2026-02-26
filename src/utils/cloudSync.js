import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { getStreakState } from "./streak";

const STORAGE_KEY = "notation_trainer_opening_progress_v2";
const CUSTOM_REPS_KEY = "notation_trainer_custom_lines_v1";
const ACTIVITY_DAYS_KEY = "chessdrills.activity_days.v1";
const LEARN_PROGRESS_KEY = "notation_trainer_learn_progress_v1";

function safeJsonParse(raw, fallback) {
  try {
    return JSON.parse(raw);
  } catch (_) {
    return fallback;
  }
}

function loadProgress() {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return { lines: {}, openings: {} };
  const parsed = safeJsonParse(raw, { lines: {}, openings: {} });
  if (!parsed || typeof parsed !== "object") return { lines: {}, openings: {} };
  if (!parsed.lines) parsed.lines = {};
  if (!parsed.openings) parsed.openings = {};
  return parsed;
}

function loadCustomReps() {
  const raw = window.localStorage.getItem(CUSTOM_REPS_KEY);
  if (!raw) return [];
  const parsed = safeJsonParse(raw, []);
  return Array.isArray(parsed) ? parsed : [];
}

function loadActivityDays() {
  const raw = window.localStorage.getItem(ACTIVITY_DAYS_KEY);
  if (!raw) return {};
  const parsed = safeJsonParse(raw, {});
  return parsed && typeof parsed === "object" ? parsed : {};
}

function loadLearnProgress() {
  const raw = window.localStorage.getItem(LEARN_PROGRESS_KEY);
  if (!raw) return { openings: {} };
  const parsed = safeJsonParse(raw, { openings: {} });
  if (!parsed || typeof parsed !== "object") return { openings: {} };
  if (!parsed.openings || typeof parsed.openings !== "object") parsed.openings = {};
  return parsed;
}

async function writeUserPatch(uid, patch) {
  const db = getFirestore();
  const ref = doc(db, "users", uid);
  await setDoc(ref, { ...patch, updatedAt: serverTimestamp() }, { merge: true });
}

let lastPublicProfileWriteAt = 0;
let pendingPublicProfileTimer = null;

function normalizeUsername(raw) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "");
}

function asObj(v) {
  return v && typeof v === "object" ? v : {};
}

function computePublicStats() {
  const progress = loadProgress();
  const linesByOpening = asObj(progress.lines);
  const openingsByKey = asObj(progress.openings);

  let openingsTrained = 0;
  Object.keys(openingsByKey).forEach((k) => {
    const o = asObj(openingsByKey[k]);
    const totalCompleted = Number(o.totalCompleted) || 0;
    if (totalCompleted > 0) openingsTrained += 1;
  });

  let linesLearned = 0;
  let totalCompletions = 0;
  let cleanRuns = 0;

  Object.keys(linesByOpening).forEach((openingKey) => {
    const bucket = asObj(linesByOpening[openingKey]);
    Object.keys(bucket).forEach((lineId) => {
      const st = asObj(bucket[lineId]);
      const tc = Number(st.timesCompleted) || 0;
      const cl = Number(st.timesClean) || 0;
      if (tc > 0) linesLearned += 1;
      totalCompletions += tc;
      cleanRuns += cl;
    });
  });

  const streak = getStreakState();
  const streakBest = Number(streak.best) || 0;
  const streakCurrent = Number(streak.current) || 0;

  return {
    openingsTrained,
    linesLearned,
    totalCompletions,
    cleanRuns,
    streakBest,
    streakCurrent
  };
}

async function writeMemberStats(uid) {
  const db = getFirestore();
  const statsRef = doc(db, "users", uid, "memberStats", "summary");
  const stats = computePublicStats();

  await setDoc(
    statsRef,
    {
      openingsTrained: Number(stats.openingsTrained) || 0,
      linesLearned: Number(stats.linesLearned) || 0,
      totalCompletions: Number(stats.totalCompletions) || 0,
      cleanRuns: Number(stats.cleanRuns) || 0,
      streakBest: Number(stats.streakBest) || 0,
      streakCurrent: Number(stats.streakCurrent) || 0,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
}

async function writePublicProfile(uid) {
  const db = getFirestore();
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return;

  const data = snap.data() || {};
  const username = normalizeUsername(data.username || "");
  if (!username) return;

  const displayName = String(data.displayName || "").trim() || "Player";

  const publicRef = doc(db, "publicProfiles", username);

  const activityDays = loadActivityDays();

  await setDoc(
    publicRef,
    {
      uid,
      username,
      displayName,
      activityDays,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
}

function schedulePublicProfileWrite(uid) {
  if (!uid) return;

  const now = Date.now();
  const delta = now - lastPublicProfileWriteAt;

  const run = () => {
    lastPublicProfileWriteAt = Date.now();
    writePublicProfile(uid).catch(() => {});
    writeMemberStats(uid).catch(() => {});
  };

  if (delta > 8000) {
    run();
    return;
  }

  if (pendingPublicProfileTimer) clearTimeout(pendingPublicProfileTimer);
  pendingPublicProfileTimer = setTimeout(run, 1200);
}


export function installCloudSync(getCurrentUser) {
  if (!getCurrentUser) return () => {};

  let lastWriteAt = 0;
  let pendingTimer = null;

  const schedule = (fn) => {
    const now = Date.now();
    const delta = now - lastWriteAt;

    if (delta > 1200) {
      lastWriteAt = now;
      fn();
      return;
    }

    if (pendingTimer) clearTimeout(pendingTimer);
    pendingTimer = setTimeout(() => {
      lastWriteAt = Date.now();
      fn();
    }, 1200);
  };

  const onStreak = () => {
    const u = getCurrentUser();
    if (!u) return;
    schedule(() => {
      writeUserPatch(u.uid, { dailyStreak: getStreakState() }).catch(() => {});
      schedulePublicProfileWrite(u.uid);
    });
  };

  const onProgress = () => {
    const u = getCurrentUser();
    if (!u) return;
    schedule(() => {
      writeUserPatch(u.uid, { progress: loadProgress() }).catch(() => {});
      schedulePublicProfileWrite(u.uid);
    });
  };

  const onLearnProgress = () => {
    const u = getCurrentUser();
    if (!u) return;
    schedule(() => {
      writeUserPatch(u.uid, { learnProgress: loadLearnProgress() }).catch(() => {});
      schedulePublicProfileWrite(u.uid);
    });
  };

  const onCustom = () => {
    const u = getCurrentUser();
    if (!u) return;
    schedule(() => {
      writeUserPatch(u.uid, { customReps: loadCustomReps() }).catch(() => {});
      schedulePublicProfileWrite(u.uid);
    });
  };

  const onActivity = () => {
    const u = getCurrentUser();
    if (!u) return;
    schedule(() => {
      writeUserPatch(u.uid, { activityDays: loadActivityDays() }).catch(() => {});
      schedulePublicProfileWrite(u.uid);
    });
  };

  window.addEventListener("streak:updated", onStreak);
  window.addEventListener("progress:updated", onProgress);
  window.addEventListener("learnprogress:updated", onLearnProgress);
  window.addEventListener("customreps:updated", onCustom);
  window.addEventListener("activity:updated", onActivity);

  return () => {
    window.removeEventListener("streak:updated", onStreak);
    window.removeEventListener("progress:updated", onProgress);
    window.removeEventListener("learnprogress:updated", onLearnProgress);
    window.removeEventListener("customreps:updated", onCustom);
    window.removeEventListener("activity:updated", onActivity);
    if (pendingTimer) clearTimeout(pendingTimer);
  };
}
