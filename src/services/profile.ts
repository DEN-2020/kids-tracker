// src/services/profile.ts
import { db } from '../db';
import { doc, getDoc } from "firebase/firestore";
import type { UserProfile } from '../types';

export const fetchUserProfile = async (uid: string) => {
  const userDoc = await getDoc(doc(db, "users", uid));
  return userDoc.exists() ? (userDoc.data() as UserProfile) : null;
};