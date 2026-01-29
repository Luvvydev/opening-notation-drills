import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { auth } from "../firebase";
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
  }, []);

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

  const value = useMemo(() => {
    return { user, authLoading, syncing, signUp, signIn, signOut };
  }, [user, authLoading, syncing]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
