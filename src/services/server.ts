import { getFunctions, httpsCallable } from 'firebase/functions';

import { app } from '../firebase';

const functions = getFunctions(app);
const useFunctionsMutations = import.meta.env.VITE_USE_FIREBASE_FUNCTIONS === 'true';

const callServerMutation = async (name: string, payload: unknown) => {
  const callable = httpsCallable(functions, name);
  const result = await callable(payload);
  return result.data;
};

const callMutation = async <T>(
  name: string,
  payload: unknown,
  fallback: () => Promise<T>,
  serverOnly = false,
) => {
  if (!useFunctionsMutations && !serverOnly) return fallback();
  return callServerMutation(name, payload) as Promise<T>;
};

export const shouldUseServerMutations = () => useFunctionsMutations;

export const registerProfileMutation = async <T>(payload: unknown, fallback: () => Promise<T>) => {
  return callMutation('registerProfile', payload, fallback, true);
};

export const upsertTaskMutation = async <T>(payload: unknown, fallback: () => Promise<T>) => {
  return callMutation('upsertTask', payload, fallback);
};

export const deleteTaskMutation = async <T>(payload: unknown, fallback: () => Promise<T>) => {
  return callMutation('deleteTask', payload, fallback);
};

export const clearTasksMutation = async <T>(payload: unknown, fallback: () => Promise<T>) => {
  return callMutation('clearTasks', payload, fallback);
};

export const submitApprovalMutation = async <T>(payload: unknown, fallback: () => Promise<T>) => {
  return callMutation('submitApproval', payload, fallback, true);
};

export const settleApprovalMutation = async <T>(payload: unknown, fallback: () => Promise<T>) => {
  return callMutation('settleApproval', payload, fallback, true);
};

export const completeTaskDirectMutation = async <T>(payload: unknown, fallback: () => Promise<T>) => {
  return callMutation('completeTaskDirect', payload, fallback, true);
};

export const upsertCatalogItemMutation = async <T>(payload: unknown, fallback: () => Promise<T>) => {
  return callMutation('upsertCatalogItem', payload, fallback, true);
};

export const deleteCatalogItemMutation = async <T>(payload: unknown, fallback: () => Promise<T>) => {
  return callMutation('deleteCatalogItem', payload, fallback, true);
};

export const activateAchievementMutation = async <T>(payload: unknown, fallback: () => Promise<T>) => {
  return callMutation('activateAchievement', payload, fallback, true);
};

export const upsertFamilyMemberMutation = async <T>(payload: unknown, fallback: () => Promise<T>) => {
  return callMutation('upsertFamilyMember', payload, fallback, true);
};

export const deleteFamilyMemberMutation = async <T>(payload: unknown, fallback: () => Promise<T>) => {
  return callMutation('deleteFamilyMember', payload, fallback, true);
};
