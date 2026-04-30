import { getAnalytics, isSupported, logEvent as firebaseLogEvent } from "firebase/analytics";
import { addDoc, collection, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { app, db } from "../firebase";

const VISITOR_KEY = "chessdrills_visitor_id_v1";
const SESSION_KEY = "chessdrills_session_id_v1";
const FIRST_SEEN_KEY = "chessdrills_first_seen_v1";
const FIRST_VISIT_LOGGED_KEY = "chessdrills_first_visit_logged_v1";
const DAY_2_LOGGED_KEY = "chessdrills_day_2_return_logged_v1";
const ONCE_KEY_PREFIX = "chessdrills_event_once_v1";
const SESSION_MS = 30 * 60 * 1000;

let analyticsPromise = null;

function nowMs() {
  return Date.now();
}

function getWindowPath() {
  if (typeof window === "undefined") return "";
  return `${window.location.pathname || "/"}${window.location.search || ""}`;
}

function safeLocalStorageGet(key) {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    return window.localStorage.getItem(key);
  } catch (_) {
    return null;
  }
}

function safeLocalStorageSet(key, value) {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    window.localStorage.setItem(key, value);
  } catch (_) {}
}

function randomId(prefix) {
  return `${prefix}_${nowMs()}_${Math.random().toString(36).slice(2, 10)}`;
}

function getVisitorId() {
  const existing = safeLocalStorageGet(VISITOR_KEY);
  if (existing) return existing;

  const next = randomId("visitor");
  safeLocalStorageSet(VISITOR_KEY, next);
  return next;
}

function getSessionId() {
  const raw = safeLocalStorageGet(SESSION_KEY);
  const now = nowMs();

  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.id && now - (Number(parsed.lastSeenAt) || 0) < SESSION_MS) {
        safeLocalStorageSet(SESSION_KEY, JSON.stringify({ id: parsed.id, lastSeenAt: now }));
        return parsed.id;
      }
    } catch (_) {}
  }

  const id = randomId("session");
  safeLocalStorageSet(SESSION_KEY, JSON.stringify({ id, lastSeenAt: now }));
  return id;
}

function sanitizeEventName(name) {
  const clean = String(name || "event")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);

  return clean || "event";
}

function sanitizeParamValue(value) {
  if (value == null) return undefined;

  if (typeof value === "string") return value.slice(0, 500);
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "boolean") return value;

  try {
    return JSON.stringify(value).slice(0, 500);
  } catch (_) {
    return undefined;
  }
}

function sanitizeParams(params) {
  const out = {};
  const input = params && typeof params === "object" ? params : {};

  Object.keys(input).slice(0, 30).forEach((key) => {
    const safeKey = String(key || "")
      .replace(/[^a-zA-Z0-9_]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40);

    if (!safeKey) return;
    const safeValue = sanitizeParamValue(input[key]);
    if (safeValue !== undefined) out[safeKey] = safeValue;
  });

  return out;
}

function getAnalyticsClient() {
  if (typeof window === "undefined") return Promise.resolve(null);

  if (!analyticsPromise) {
    analyticsPromise = isSupported()
      .then((supported) => (supported ? getAnalytics(app) : null))
      .catch(() => null);
  }

  return analyticsPromise;
}

function shouldPersist(user, persist) {
  return persist !== false && !!(user && user.uid);
}

export function trackEvent(name, params = {}, user = null, options = {}) {
  const eventName = sanitizeEventName(name);
  const eventParams = sanitizeParams(params);
  const visitorId = getVisitorId();
  const sessionId = getSessionId();
  const path = getWindowPath();
  const clientCreatedAt = nowMs();

  const analyticsParams = {
    ...eventParams,
    visitor_id: visitorId,
    session_id: sessionId,
    path,
    client_created_at: clientCreatedAt
  };

  getAnalyticsClient().then((analytics) => {
    if (!analytics) return;
    try {
      firebaseLogEvent(analytics, eventName, analyticsParams);
    } catch (_) {}
  });

  if (shouldPersist(user, options.persist)) {
    try {
      addDoc(collection(db, "users", user.uid, "analyticsEvents"), {
        name: eventName,
        params: eventParams,
        visitorId,
        sessionId,
        path,
        createdAt: serverTimestamp(),
        clientCreatedAt
      }).catch(() => {});
    } catch (_) {}
  }
}

export function trackFirstVisit(user = null) {
  const firstSeen = Number(safeLocalStorageGet(FIRST_SEEN_KEY)) || 0;
  const alreadyLogged = safeLocalStorageGet(FIRST_VISIT_LOGGED_KEY);
  const now = nowMs();

  if (!firstSeen) safeLocalStorageSet(FIRST_SEEN_KEY, String(now));
  if (alreadyLogged) return;

  trackEvent("first_visit", { first_seen_at: firstSeen || now }, user, { persist: false });
  safeLocalStorageSet(FIRST_VISIT_LOGGED_KEY, "1");
}

export function trackDay2Return(user = null) {
  const firstSeen = Number(safeLocalStorageGet(FIRST_SEEN_KEY)) || 0;
  const alreadyLogged = safeLocalStorageGet(DAY_2_LOGGED_KEY);
  const now = nowMs();

  if (!firstSeen) {
    safeLocalStorageSet(FIRST_SEEN_KEY, String(now));
    return;
  }

  if (alreadyLogged) return;

  const ageHours = (now - firstSeen) / (1000 * 60 * 60);
  if (ageHours < 24 || ageHours > 72) return;

  trackEvent(
    "day_2_return",
    {
      first_seen_at: firstSeen,
      return_age_hours: Math.round(ageHours)
    },
    user
  );
  safeLocalStorageSet(DAY_2_LOGGED_KEY, "1");
}

export function trackOncePerUser(user, name, params = {}) {
  if (!user || !user.uid) return;

  const eventName = sanitizeEventName(name);
  const key = `${ONCE_KEY_PREFIX}_${user.uid}_${eventName}`;
  if (safeLocalStorageGet(key)) return;

  const eventParams = sanitizeParams(params);
  const visitorId = getVisitorId();
  const sessionId = getSessionId();
  const path = getWindowPath();
  const clientCreatedAt = nowMs();

  trackEvent(eventName, eventParams, user, { persist: false });

  try {
    setDoc(doc(db, "users", user.uid, "analyticsEvents", eventName), {
      name: eventName,
      params: eventParams,
      visitorId,
      sessionId,
      path,
      createdAt: serverTimestamp(),
      clientCreatedAt
    }).catch(() => {});
  } catch (_) {}

  safeLocalStorageSet(key, "1");
}

export function trackMembershipMilestones(user, userDoc) {
  if (!user || !user.uid || !userDoc) return;

  if (userDoc.trialStartedAt || userDoc.trialUsed) {
    trackOncePerUser(user, "trial_start", {
      source: "membership_state",
      membership_tier: userDoc.membershipTier || "free"
    });
  }

  const tier = userDoc.membershipTier || "free";
  const paidActive = !!userDoc.membershipActive && (tier === "member" || tier === "lifetime");

  if (paidActive) {
    trackOncePerUser(user, "paid_conversion", {
      source: "membership_state",
      membership_tier: tier,
      membership_plan: userDoc.membershipPlan || "unknown"
    });
  }
}

export function getSignupSourceFromReason(reason, fallback = "direct") {
  if (reason === "my_games_requires_account") return "my_games";
  if (reason === "demo") return "demo";
  if (reason === "membership_requires_account") return "membership";
  if (reason === "protected_route") return "protected_route";
  return fallback || "direct";
}
