// src/types.ts

export interface UserProfile { 
  uid: string; 
  name: string; 
  avatar: string; 
  role: 'child' | 'parent'; 
  totalPoints?: number; 
  currentBalance?: number; 
  familyId: string; 
}

export interface PartialProfile {
  uid: string;
  name: string;
  avatar: string;
  role?: never; 
  familyId?: never;
}

export type AppProfile = UserProfile | PartialProfile;

// ИСПРАВЛЕНО: Добавлены экспорты, которых не хватало
export interface Task { 
  id: string; 
  label: string; 
  points: number; 
  icon?: string; 
  familyId?: string;
  duration?: number; 
  isAutoRepeat?: boolean; 
  isAutoApprove?: boolean; 
  isAutoPayout?: boolean; 
  lastCompleted?: string; 
  assignedTo?: string; 
}

export interface Approval { 
  id: string; 
  taskId?: string; 
  label: string; 
  points: number; 
  familyId?: string;
  status: 'pending' | 'in_progress' | 'completed'; 
  userId: string; 
  icon?: string; 
}
