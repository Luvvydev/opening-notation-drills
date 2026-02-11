import { getFirestore, doc, setDoc, serverTimestamp } from "firebase/firestore";
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
    schedule(() => writeUserPatch(u.uid, { dailyStreak: getStreakState() }).catch(() => {}));
  };

  const onProgress = () => {
    const u = getCurrentUser();
    if (!u) return;
    schedule(() => writeUserPatch(u.uid, { progress: loadProgress() }).catch(() => {}));
  };

  const onLearnProgress = () => {
    const u = getCurrentUser();
    if (!u) return;
    schedule(() => writeUserPatch(u.uid, { learnProgress: loadLearnProgress() }).catch(() => {}));
  };

  const onCustom = () => {
    const u = getCurrentUser();
    if (!u) return;
    schedule(() => writeUserPatch(u.uid, { customReps: loadCustomReps() }).catch(() => {}));
  };

  const onActivity = () => {
    const u = getCurrentUser();
    if (!u) return;
    schedule(() => writeUserPatch(u.uid, { activityDays: loadActivityDays() }).catch(() => {}));
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
