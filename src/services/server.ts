import { getFunctions, httpsCallable } from 'firebase/functions';

import { app } from '../firebase';

const functions = getFunctions(app);
const useFunctionsMutations = import.meta.env.VITE_USE_FIREBASE_FUNCTIONS === 'true';

const callServerMutation = async (name: string, payload: unknown) => {
  const callable = httpsCallable(functions, name);
  const result = await callable(payload);
  return result.data;
};

export const shouldUseServerMutations = () => useFunctionsMutations;

export const registerProfileMutation = async <T>(payload: unknown, fallback: () => Promise<T>) => {
  if (!useFunctionsMutations) return fallback();
  return callServerMutation('registerProfile', payload) as Promise<T>;
};

export const upsertTaskMutation = async <T>(payload: unknown, fallback: () => Promise<T>) => {
  if (!useFunctionsMutations) return fallback();
  return callServerMutation('upsertTask', payload) as Promise<T>;
};

export const deleteTaskMutation = async <T>(payload: unknown, fallback: () => Promise<T>) => {
  if (!useFunctionsMutations) return fallback();
  return callServerMutation('deleteTask', payload) as Promise<T>;
};

export const clearTasksMutation = async <T>(payload: unknown, fallback: () => Promise<T>) => {
  if (!useFunctionsMutations) return fallback();
  return callServerMutation('clearTasks', payload) as Promise<T>;
};

export const submitApprovalMutation = async <T>(payload: unknown, fallback: () => Promise<T>) => {
  if (!useFunctionsMutations) return fallback();
  return callServerMutation('submitApproval', payload) as Promise<T>;
};

export const settleApprovalMutation = async <T>(payload: unknown, fallback: () => Promise<T>) => {
  if (!useFunctionsMutations) return fallback();
  return callServerMutation('settleApproval', payload) as Promise<T>;
};

export const completeTaskDirectMutation = async <T>(payload: unknown, fallback: () => Promise<T>) => {
  if (!useFunctionsMutations) return fallback();
  return callServerMutation('completeTaskDirect', payload) as Promise<T>;
};

export const upsertCatalogItemMutation = async <T>(payload: unknown, fallback: () => Promise<T>) => {
  if (!useFunctionsMutations) return fallback();
  return callServerMutation('upsertCatalogItem', payload) as Promise<T>;
};

export const deleteCatalogItemMutation = async <T>(payload: unknown, fallback: () => Promise<T>) => {
  if (!useFunctionsMutations) return fallback();
  return callServerMutation('deleteCatalogItem', payload) as Promise<T>;
};

export const activateAchievementMutation = async <T>(payload: unknown, fallback: () => Promise<T>) => {
  if (!useFunctionsMutations) return fallback();
  return callServerMutation('activateAchievement', payload) as Promise<T>;
};

export const upsertFamilyMemberMutation = async <T>(payload: unknown, fallback: () => Promise<T>) => {
  if (!useFunctionsMutations) return fallback();
  return callServerMutation('upsertFamilyMember', payload) as Promise<T>;
};

export const deleteFamilyMemberMutation = async <T>(payload: unknown, fallback: () => Promise<T>) => {
  if (!useFunctionsMutations) return fallback();
  return callServerMutation('deleteFamilyMember', payload) as Promise<T>;
};
