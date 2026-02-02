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

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [userDoc, setUserDoc] = useState(null);
  const [userDocLoading, setUserDocLoading] = useState(true);

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
  const membershipActive = !!(userDoc && userDoc.membershipActive);
  const isMember = membershipActive && (membershipTier === "member" || membershipTier === "lifetime");

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
      signUp,
      signIn,
      signOut
    };
  }, [user, authLoading, syncing, userDoc, userDocLoading, membershipTier, membershipActive, isMember]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
