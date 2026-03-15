// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, serverTimestamp } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

const readEnv = (key) => {
  if (typeof process !== "undefined" && process.env) {
    return process.env[key];
  }
  return undefined;
};

const firebaseConfig = {
  apiKey: readEnv("REACT_APP_FIREBASE_API_KEY"),
  authDomain: readEnv("REACT_APP_FIREBASE_AUTH_DOMAIN"),
  projectId: readEnv("REACT_APP_FIREBASE_PROJECT_ID"),
  appId: readEnv("REACT_APP_FIREBASE_APP_ID")
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);
export { serverTimestamp };
