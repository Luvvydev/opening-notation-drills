import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { auth, db } from "../firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { syncAccountFromLocalAndCloud } from "../utils/accountSync";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut as firebaseSignOut
} from "firebase/auth";

const AuthContext = createContext(null);

const TRIAL_MS = 3 * 24 * 60 * 60 * 1000;

function toMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (value instanceof Date) return value.getTime();
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [userDoc, setUserDoc] = useState(null);
  const [userDocLoading, setUserDocLoading] = useState(true);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u || null);
      setAuthLoading(false);

      if (u && u.uid) {
        try {
          setSyncing(true);
          await syncAccountFromLocalAndCloud(u);

          // Let the app know data may have changed locally after sync
          try {
            window.dispatchEvent(new Event("account:synced"));
            window.dispatchEvent(new Event("streak:updated"));
          } catch (_) {}
        } finally {
          setSyncing(false);
        }
      }
    });

    return () => unsub();
  }, [])

  useEffect(() => {
    if (!user || !user.uid) {
      setUserDoc(null);
      setUserDocLoading(false);
      return;
    }

    setUserDocLoading(true);

    const ref = doc(db, "users", user.uid);
    const off = onSnapshot(
      ref,
      (snap) => {
        setUserDoc(snap.exists() ? snap.data() : null);
        setUserDocLoading(false);
      },
      () => {
        setUserDoc(null);
        setUserDocLoading(false);
      }
    );

    return () => off();
  }, [user]);

  useEffect(() => {
    const hasTrialClock = !!(userDoc && userDoc.trialStartedAt) && !((userDoc && userDoc.membershipActive) && ((userDoc && userDoc.membershipTier) === "member" || (userDoc && userDoc.membershipTier) === "lifetime"));

    if (!hasTrialClock) return undefined;

    const tick = () => setNowMs(Date.now());
    tick();

    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [userDoc]);


const signUp = (email, password) => {
  return createUserWithEmailAndPassword(
    auth,
    String(email || ""),
    String(password || "")
  );
};

const signIn = (email, password) => {
  return signInWithEmailAndPassword(
    auth,
    String(email || ""),
    String(password || "")
  );
};


const signOut = () => firebaseSignOut(auth);

  const membershipTier = (userDoc && userDoc.membershipTier) || "free";
  const hasPaidMembership = !!(userDoc && userDoc.membershipActive) && (membershipTier === "member" || membershipTier === "lifetime");

  const trialUsed = !!(userDoc && userDoc.trialUsed);
  const trialStartedAtMs = toMillis(userDoc && userDoc.trialStartedAt);
  const trialEndsAtMs = trialStartedAtMs ? trialStartedAtMs + TRIAL_MS : 0;
  const trialActive = !hasPaidMembership && trialUsed && trialStartedAtMs > 0 && nowMs < trialEndsAtMs;
  const trialExpired = !hasPaidMembership && trialUsed && trialStartedAtMs > 0 && nowMs >= trialEndsAtMs;
  const trialEligible = !!user && !hasPaidMembership && !trialUsed;

  const membershipActive = hasPaidMembership || trialActive;
  const isMember = membershipActive;

  const value = useMemo(() => {
    return {
      user,
      authLoading,
      syncing,
      userDoc,
      userDocLoading,
      membershipTier,
      membershipActive,
      isMember,
      hasPaidMembership,
      trialUsed,
      trialActive,
      trialExpired,
      trialEligible,
      trialStartedAtMs,
      trialEndsAtMs,
      signUp,
      signIn,
      signOut
    };
  }, [user, authLoading, syncing, userDoc, userDocLoading, membershipTier, membershipActive, isMember, hasPaidMembership, trialUsed, trialActive, trialExpired, trialEligible, trialStartedAtMs, trialEndsAtMs]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
