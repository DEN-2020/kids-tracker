import { collection, getDocs, limit, query, where } from 'firebase/firestore';

import { db } from '../db';

export const normalizeFamilyId = (value: string | null | undefined) => value?.trim() ?? '';

export const getJoinFamilyIdFromSearch = (search: string) => {
  const joinFamilyId = new URLSearchParams(search).get('join');
  return normalizeFamilyId(joinFamilyId);
};

export const familyExists = async (familyId: string) => {
  const normalizedFamilyId = normalizeFamilyId(familyId);

  if (!normalizedFamilyId) {
    return false;
  }

  const familyQuery = query(
    collection(db, 'users'),
    where('familyId', '==', normalizedFamilyId),
    limit(1),
  );
  const snapshot = await getDocs(familyQuery);

  return !snapshot.empty;
};
