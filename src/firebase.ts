// src/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const readFirebaseEnv = (key: string) => {
  const value = import.meta.env[key];
  if (!value) {
    throw new Error(`Missing required Firebase env: ${key}`);
  }
  return value;
};

const firebaseConfig = {
  apiKey: readFirebaseEnv("VITE_FIREBASE_API_KEY"),
  authDomain: readFirebaseEnv("VITE_FIREBASE_AUTH_DOMAIN"),
  projectId: readFirebaseEnv("VITE_FIREBASE_PROJECT_ID"),
  storageBucket: readFirebaseEnv("VITE_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: readFirebaseEnv("VITE_FIREBASE_MESSAGING_SENDER_ID"),
  appId: readFirebaseEnv("VITE_FIREBASE_APP_ID"),
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
