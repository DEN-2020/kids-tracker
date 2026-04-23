// C:\Users\Admin\Documents\kids-tracker\src\services\database.tsx

import { db } from '../db';
import { doc, collection, writeBatch, increment, addDoc } from "firebase/firestore";
import { getLocalDayKey } from '../utils/dayKey';
import {
  completeTaskDirectMutation,
  settleApprovalMutation,
  submitApprovalMutation,
} from './server';

// Импортируем интерфейсы, чтобы не использовать "any"
// Если они у тебя лежат в App.tsx, можно импортировать их оттуда 
// или просто описать здесь для чистоты
interface Task {
  id: string;
  label: string;
  points: number;
  icon?: string;
  familyId?: string;
  isAutoApprove?: boolean;
}

interface UserProfile {
  uid: string;
  familyId: string;
}

interface CompleteTransactionOptions {
  familyId?: string;
  label?: string;
}

// Логика завершения задачи
export const completeTransaction = async (
  appId: string,
  uid: string,
  pts: number,
  tId?: string,
  options: CompleteTransactionOptions = {},
) => {
  const signedPoints = Number(pts) || 0;
  const isPurchase = signedPoints < 0;
  const historyPoints = isPurchase ? -Math.abs(signedPoints) : Math.abs(signedPoints);
  const historyLabel = options.label || (isPurchase ? "Purchase Approved" : "Task Completed");

  const fallback = async () => {
    const batch = writeBatch(db);

    if (isPurchase) {
      batch.update(doc(db, "users", uid), {
        currentBalance: increment(historyPoints),
      });
    } else {
      batch.update(doc(db, "users", uid), {
        currentBalance: increment(historyPoints),
        totalPoints: increment(historyPoints),
      });
    }

    if (tId && !isPurchase) {
      batch.update(doc(db, "tasks_list", tId), { 
        lastCompleted: getLocalDayKey(),
        lastCompletedAt: new Date(),
      });
    }

    if (appId && !appId.startsWith('temp_')) {
      batch.delete(doc(db, "approvals", appId));
    }
    
    batch.set(doc(collection(db, "history")), { 
      userId: uid, 
      ...(options.familyId ? { familyId: options.familyId } : {}),
      points: historyPoints, 
      label: historyLabel, 
      type: isPurchase ? 'spend' : 'earn', 
      date: new Date() 
    });

    return batch.commit();
  };

  try {
    if (appId && !appId.startsWith('direct_')) {
      return await settleApprovalMutation({ approvalId: appId }, fallback);
    }

    return await completeTaskDirectMutation({
      label: historyLabel,
      points: Math.abs(historyPoints),
      taskId: tId,
      userId: uid,
    }, fallback);
  } catch (err) {
    console.error("❌ Transaction Error:", err);
    throw err;
  }
};

// Логика создания новой заявки
// ЗАМЕНИЛИ any на типы Task и UserProfile
export const createTaskApproval = async (task: Task, profile: UserProfile) => {
  return await submitApprovalMutation(
    {
      icon: task.icon || '📝',
      label: task.label,
      points: task.points,
      status: task.isAutoApprove ? "in_progress" : "pending",
      taskId: task.id,
      userId: profile.uid,
    },
    async () => addDoc(collection(db, "approvals"), {
      taskId: task.id, 
      label: task.label, 
      points: task.points,
      status: task.isAutoApprove ? "in_progress" : "pending",
      userId: profile.uid, 
      familyId: profile.familyId, 
      createdAt: new Date(), 
      icon: task.icon || '📝'
    }),
  );
};
