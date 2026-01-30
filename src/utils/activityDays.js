import { auth, db, serverTimestamp } from "../firebase";
import { doc, setDoc, increment } from "firebase/firestore";

const LS_ACTIVITY_DAYS_KEY = "chessdrills.activity_days.v1";

function todayYMD() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function getActivityDays() {
  try {
    const raw = localStorage.getItem(LS_ACTIVITY_DAYS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveActivityDays(days) {
  try {
    localStorage.setItem(LS_ACTIVITY_DAYS_KEY, JSON.stringify(days));
  } catch (_) {}
}

function emitActivityUpdated() {
  try {
    window.dispatchEvent(new Event("activity:updated"));
  } catch (_) {}
}

let lastSoftMarkAt = 0;
let lastRemoteWriteAt = 0;

async function tryWriteRemote(today, amount) {
  const u = auth && auth.currentUser ? auth.currentUser : null;
  if (!u || !u.uid) return;

  // Avoid hammering Firestore if we mark activity frequently
  const now = Date.now();
  if (now - lastRemoteWriteAt < 20000) return;
  lastRemoteWriteAt = now;

  try {
    const ref = doc(db, "users", u.uid);

    await setDoc(
      ref,
      {
        activityDays: { [today]: increment(amount) },
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
  } catch (_) {
    // ignore
  }
}

/**
 * Hard mark: increments the day counter every time you call it.
 * Use this for meaningful events like completing a line.
 */
export function markActivityToday(amount = 1) {
  const days = getActivityDays();
  const today = todayYMD();

  const prev = Number(days[today]) || 0;
  const next = prev + (Number(amount) || 1);
  days[today] = next;

  saveActivityDays(days);
  emitActivityUpdated();

  tryWriteRemote(today, Number(amount) || 1);
}

/**
 * Soft mark: increments at most once per 15 minutes.
 * Use this for "user is active" signals like making moves, browsing openings, etc.
 */
export function touchActivityToday() {
  const now = Date.now();
  if (now - lastSoftMarkAt < 15 * 60 * 1000) return;
  lastSoftMarkAt = now;

  markActivityToday(1);
}
