import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

initializeApp();

const db = getFirestore();

const COLLECTIONS = {
  approvals: 'approvals',
  catalog: 'achievements_list',
  history: 'history',
  tasks: 'tasks_list',
  users: 'users',
};

const pad = (value) => value.toString().padStart(2, '0');

const getLocalDayKey = (date = new Date()) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const normalizeString = (value) => (typeof value === 'string' ? value.trim() : '');

const sanitizeOptionalString = (value) => {
  const normalized = normalizeString(value);
  return normalized || null;
};

const normalizeApprovalStatus = (value, allowedStatuses = ['pending']) => {
  const status = normalizeString(value) || allowedStatuses[0];
  if (!allowedStatuses.includes(status)) {
    throw new HttpsError('invalid-argument', 'Unsupported approval status.');
  }

  return status;
};

const isTaskAssignedToUser = (task, userId) => {
  const assignedTo = normalizeString(task?.assignedTo) || 'all';
  return assignedTo === 'all' || assignedTo === userId;
};

const assertTaskAssignedToUser = (task, userId) => {
  if (!isTaskAssignedToUser(task, userId)) {
    throw new HttpsError('permission-denied', 'Task is not assigned to this user.');
  }
};

const buildTaskApproval = ({ familyId, requestedUserId, status, task, taskId }) => {
  const label = normalizeString(task?.label);
  const points = Math.abs(Number(task?.points) || 0);

  if (!label) {
    throw new HttpsError('failed-precondition', 'Task label is missing.');
  }

  if (!points) {
    throw new HttpsError('failed-precondition', 'Task points must be greater than zero.');
  }

  return {
    approvalType: 'task',
    createdAt: new Date().toISOString(),
    familyId,
    icon: sanitizeOptionalString(task?.icon) || '📝',
    label,
    points,
    status,
    taskId,
    userId: requestedUserId,
  };
};

const buildPurchaseApproval = ({ familyId, item, itemId, requestedUserId }) => {
  const itemType = normalizeString(item?.type);
  const sanitizedLabel = normalizeString(item?.label);
  const negativePoints = -Math.abs(Number(item?.threshold) || 0);

  if (!['reward', 'exchange'].includes(itemType)) {
    throw new HttpsError('invalid-argument', 'Only reward and exchange items can be purchased.');
  }

  if (!sanitizedLabel) {
    throw new HttpsError('invalid-argument', 'Approval label is required.');
  }

  if (!negativePoints) {
    throw new HttpsError('invalid-argument', 'Purchase points must be less than zero.');
  }

  return {
    approvalType: 'purchase',
    createdAt: new Date().toISOString(),
    familyId,
    icon: sanitizeOptionalString(item?.icon) || '🛍️',
    itemId,
    label: sanitizedLabel,
    points: negativePoints,
    status: 'pending',
    taskId: null,
    userId: requestedUserId,
  };
};

const assertAuth = (auth) => {
  if (!auth?.uid) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }

  return auth.uid;
};

const assertRole = (profile, role) => {
  if (!profile || profile.role !== role) {
    throw new HttpsError('permission-denied', `${role} role is required.`);
  }
};

const requireProfile = async (uid) => {
  const snapshot = await db.collection(COLLECTIONS.users).doc(uid).get();
  if (!snapshot.exists) {
    throw new HttpsError('failed-precondition', 'User profile was not found.');
  }

  return { id: snapshot.id, ...snapshot.data() };
};

const requireSameFamilyDocument = async (collectionName, docId, familyId) => {
  const snapshot = await db.collection(collectionName).doc(docId).get();
  if (!snapshot.exists) {
    throw new HttpsError('not-found', `Document ${docId} was not found.`);
  }

  const data = snapshot.data();
  if (data.familyId !== familyId) {
    throw new HttpsError('permission-denied', 'Cross-family access is forbidden.');
  }

  return { ref: snapshot.ref, id: snapshot.id, ...data };
};

const getFamilyExists = async (familyId) => {
  const snapshot = await db
    .collection(COLLECTIONS.users)
    .where('familyId', '==', familyId)
    .limit(1)
    .get();

  return !snapshot.empty;
};

const generateFamilyId = (uid) =>
  `fam_${uid.slice(0, 5)}_${Math.random().toString(36).slice(2, 7)}`;

const getPendingPurchaseReservation = (snapshot) =>
  snapshot.docs.reduce((sum, approvalDoc) => {
    const approvalData = approvalDoc.data();
    if (approvalData.approvalType !== 'purchase' || approvalData.status !== 'pending') {
      return sum;
    }

    return sum + Math.abs(Number(approvalData.points) || 0);
  }, 0);

const isCompletedToday = (task) => normalizeString(task?.lastCompleted) === getLocalDayKey();

const mapTaskPayload = (task, familyId) => {
  const label = normalizeString(task?.label);
  if (!label) {
    throw new HttpsError('invalid-argument', 'Task label is required.');
  }

  const points = Number(task?.points);
  if (!Number.isFinite(points) || points <= 0) {
    throw new HttpsError('invalid-argument', 'Task points must be greater than zero.');
  }

  const assignedTo = normalizeString(task?.assignedTo) || 'all';
  const durationValue = Number(task?.duration);

  return {
    assignedTo,
    duration: Number.isFinite(durationValue) && durationValue > 0 ? durationValue : null,
    familyId,
    icon: sanitizeOptionalString(task?.icon) || '📝',
    isAutoApprove: Boolean(task?.isAutoApprove),
    isAutoPayout: Boolean(task?.isAutoApprove) && Boolean(task?.isAutoPayout),
    isAutoRepeat: Boolean(task?.isAutoRepeat),
    label,
    points,
  };
};

const mapCatalogPayload = (item, familyId) => {
  const type = normalizeString(item?.type);
  if (!['reward', 'exchange', 'title'].includes(type)) {
    throw new HttpsError('invalid-argument', 'Unsupported catalog item type.');
  }

  const label = normalizeString(item?.label);
  if (!label) {
    throw new HttpsError('invalid-argument', 'Catalog item label is required.');
  }

  const threshold = Number(item?.threshold);
  if (!Number.isFinite(threshold) || threshold <= 0) {
    throw new HttpsError('invalid-argument', 'Catalog threshold must be greater than zero.');
  }

  const payload = {
    bonus: sanitizeOptionalString(item?.bonus),
    description: sanitizeOptionalString(item?.description),
    familyId,
    icon: sanitizeOptionalString(item?.icon) || '🏆',
    label,
    threshold,
    type,
    valueInEuro: null,
  };

  if (type === 'exchange') {
    const valueInEuro = Number(item?.valueInEuro);
    payload.valueInEuro = Number.isFinite(valueInEuro) ? valueInEuro : 0;
  }

  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== null));
};

export const registerProfile = onCall(async (request) => {
  const uid = assertAuth(request.auth);
  const existingSnapshot = await db.collection(COLLECTIONS.users).doc(uid).get();
  if (existingSnapshot.exists) {
    return existingSnapshot.data();
  }

  const name = normalizeString(request.data?.name);
  const role = normalizeString(request.data?.role);
  const avatar = sanitizeOptionalString(request.data?.avatar) || '👶';
  const incomingFamilyId = normalizeString(request.data?.familyId);

  if (!name) {
    throw new HttpsError('invalid-argument', 'Profile name is required.');
  }

  if (!['child', 'parent'].includes(role)) {
    throw new HttpsError('invalid-argument', 'Unsupported profile role.');
  }

  if (incomingFamilyId) {
    const familyExists = await getFamilyExists(incomingFamilyId);
    if (!familyExists) {
      throw new HttpsError('not-found', 'Family was not found.');
    }

    if (role !== 'child') {
      throw new HttpsError(
        'failed-precondition',
        'Only child profiles can join an existing family via invite code.',
      );
    }
  }

  const familyId = incomingFamilyId || generateFamilyId(uid);
  const profile = {
    avatar,
    currentBalance: 0,
    familyId,
    name,
    role,
    totalPoints: 0,
    uid,
  };

  await db.collection(COLLECTIONS.users).doc(uid).set(profile);

  return profile;
});

export const upsertTask = onCall(async (request) => {
  const uid = assertAuth(request.auth);
  const profile = await requireProfile(uid);
  assertRole(profile, 'parent');

  const taskId = normalizeString(request.data?.taskId);
  const taskPayload = mapTaskPayload(request.data?.task, profile.familyId);

  if (taskId) {
    const existingTask = await requireSameFamilyDocument(COLLECTIONS.tasks, taskId, profile.familyId);
    await existingTask.ref.update(taskPayload);
    return { id: taskId, ...taskPayload };
  }

  const createdTask = await db.collection(COLLECTIONS.tasks).add(taskPayload);
  return { id: createdTask.id, ...taskPayload };
});

export const deleteTask = onCall(async (request) => {
  const uid = assertAuth(request.auth);
  const profile = await requireProfile(uid);
  assertRole(profile, 'parent');

  const taskId = normalizeString(request.data?.taskId);
  if (!taskId) {
    throw new HttpsError('invalid-argument', 'Task id is required.');
  }

  const task = await requireSameFamilyDocument(COLLECTIONS.tasks, taskId, profile.familyId);
  const approvalsSnapshot = await db
    .collection(COLLECTIONS.approvals)
    .where('familyId', '==', profile.familyId)
    .get();

  const batch = db.batch();
  batch.delete(task.ref);

  approvalsSnapshot.docs.forEach((approvalSnapshot) => {
    if (approvalSnapshot.data().taskId === taskId) {
      batch.delete(approvalSnapshot.ref);
    }
  });

  await batch.commit();

  return { ok: true };
});

export const clearTasks = onCall(async (request) => {
  const uid = assertAuth(request.auth);
  const profile = await requireProfile(uid);
  assertRole(profile, 'parent');

  const selectedChildId = normalizeString(request.data?.selectedChildId);
  if (!selectedChildId) {
    throw new HttpsError('invalid-argument', 'Selected child id is required.');
  }

  const snapshot = await db
    .collection(COLLECTIONS.tasks)
    .where('familyId', '==', profile.familyId)
    .get();
  const approvalsSnapshot = await db
    .collection(COLLECTIONS.approvals)
    .where('familyId', '==', profile.familyId)
    .get();

  const batch = db.batch();
  let deletedCount = 0;
  const deletedTaskIds = new Set();

  snapshot.docs.forEach((taskSnapshot) => {
    const task = taskSnapshot.data();
    const belongsToChild = task.assignedTo === selectedChildId || task.assignedTo === 'all';
    if (belongsToChild && !task.isAutoRepeat) {
      batch.delete(taskSnapshot.ref);
      deletedCount += 1;
      deletedTaskIds.add(taskSnapshot.id);
    }
  });

  approvalsSnapshot.docs.forEach((approvalSnapshot) => {
    if (deletedTaskIds.has(approvalSnapshot.data().taskId)) {
      batch.delete(approvalSnapshot.ref);
    }
  });

  if (deletedCount > 0) {
    await batch.commit();
  }

  return { deletedCount };
});

export const submitApproval = onCall(async (request) => {
  const uid = assertAuth(request.auth);
  const profile = await requireProfile(uid);

  const taskId = sanitizeOptionalString(request.data?.taskId);
  const requestedUserId = normalizeString(request.data?.userId) || uid;

  if (requestedUserId !== uid) {
    assertRole(profile, 'parent');
  }

  await requireSameFamilyDocument(COLLECTIONS.users, requestedUserId, profile.familyId);
  let approval;

  if (taskId) {
    const status = normalizeApprovalStatus(request.data?.status, ['pending', 'in_progress']);
    if (status === 'in_progress' && profile.role !== 'parent') {
      throw new HttpsError('permission-denied', 'Only a parent can start an in-progress approval.');
    }

    const task = await requireSameFamilyDocument(COLLECTIONS.tasks, taskId, profile.familyId);
    assertTaskAssignedToUser(task, requestedUserId);

    approval = buildTaskApproval({
      familyId: profile.familyId,
      requestedUserId,
      status,
      task,
      taskId,
    });
  } else {
    normalizeApprovalStatus(request.data?.status, ['pending']);
    const itemId = normalizeString(request.data?.itemId);
    if (!itemId) {
      throw new HttpsError('invalid-argument', 'Catalog item id is required.');
    }

    const item = await requireSameFamilyDocument(COLLECTIONS.catalog, itemId, profile.familyId);
    approval = buildPurchaseApproval({
      familyId: profile.familyId,
      item,
      itemId,
      requestedUserId,
    });

    const approvalRef = db.collection(COLLECTIONS.approvals).doc();
    const approvalsQuery = db
      .collection(COLLECTIONS.approvals)
      .where('familyId', '==', profile.familyId)
      .where('userId', '==', requestedUserId);
    const targetUserRef = db.collection(COLLECTIONS.users).doc(requestedUserId);
    const requestedCost = Math.abs(Number(approval.points) || 0);

    await db.runTransaction(async (transaction) => {
      const [targetUserSnapshot, approvalsSnapshot] = await Promise.all([
        transaction.get(targetUserRef),
        transaction.get(approvalsQuery),
      ]);

      if (!targetUserSnapshot.exists) {
        throw new HttpsError('failed-precondition', 'User profile was not found.');
      }

      const targetUser = targetUserSnapshot.data();
      if (targetUser.familyId !== profile.familyId) {
        throw new HttpsError('permission-denied', 'Cross-family access is forbidden.');
      }

      const currentBalance = Number(targetUser.currentBalance) || 0;
      const reservedBalance = getPendingPurchaseReservation(approvalsSnapshot);
      const availableBalance = currentBalance - reservedBalance;

      if (availableBalance < requestedCost) {
        throw new HttpsError(
          'failed-precondition',
          'Not enough available balance for this purchase request.',
        );
      }

      transaction.set(approvalRef, approval);
    });

    return { id: approvalRef.id, ...approval };
  }

  const docRef = await db.collection(COLLECTIONS.approvals).add(approval);
  return { id: docRef.id, ...approval };
});

export const settleApproval = onCall(async (request) => {
  const uid = assertAuth(request.auth);
  const profile = await requireProfile(uid);

  const approvalId = normalizeString(request.data?.approvalId);
  if (!approvalId) {
    throw new HttpsError('invalid-argument', 'Approval id is required.');
  }

  const approval = await requireSameFamilyDocument(COLLECTIONS.approvals, approvalId, profile.familyId);
  const isParent = profile.role === 'parent';
  const canSettleOwnProgress =
    approval.approvalType === 'task' &&
    approval.userId === uid &&
    approval.status === 'in_progress' &&
    Boolean(approval.taskId);

  if (!isParent && !canSettleOwnProgress) {
    throw new HttpsError('permission-denied', 'You are not allowed to settle this approval.');
  }

  const targetUser = await requireSameFamilyDocument(COLLECTIONS.users, approval.userId, profile.familyId);
  const isTaskApproval = approval.approvalType === 'task' || Boolean(approval.taskId);
  const taskPoints = Math.abs(Number(approval.points) || 0);
  const purchasePoints = Number(approval.points) || 0;
  const isPurchase = !isTaskApproval;
  const historyLabel = normalizeString(approval.label) || (isPurchase ? 'Purchase Approved' : 'Task Completed');

  if (!(isPurchase ? Math.abs(purchasePoints) : taskPoints)) {
    throw new HttpsError(
      'failed-precondition',
      isPurchase ? 'Purchase approval has invalid points.' : 'Task approval has invalid points.',
    );
  }

  if (isPurchase) {
    const approvalRef = approval.ref;
    const purchaseCost = Math.abs(purchasePoints);

    await db.runTransaction(async (transaction) => {
      const [approvalSnapshot, targetUserSnapshot] = await Promise.all([
        transaction.get(approvalRef),
        transaction.get(targetUser.ref),
      ]);

      if (!approvalSnapshot.exists) {
        throw new HttpsError('not-found', 'Approval was not found.');
      }

      if (!targetUserSnapshot.exists) {
        throw new HttpsError('failed-precondition', 'User profile was not found.');
      }

      const approvalData = approvalSnapshot.data();
      const targetUserData = targetUserSnapshot.data();

      if (approvalData.familyId !== profile.familyId || targetUserData.familyId !== profile.familyId) {
        throw new HttpsError('permission-denied', 'Cross-family access is forbidden.');
      }

      const currentBalance = Number(targetUserData.currentBalance) || 0;
      if (currentBalance < purchaseCost) {
        throw new HttpsError('failed-precondition', 'Not enough balance to approve this purchase.');
      }

      transaction.update(targetUser.ref, {
        currentBalance: currentBalance - purchaseCost,
      });
      transaction.set(db.collection(COLLECTIONS.history).doc(), {
        date: new Date(),
        familyId: profile.familyId,
        label: historyLabel,
        points: -purchaseCost,
        type: 'spend',
        userId: approval.userId,
      });
      transaction.delete(approvalRef);
    });

    return { ok: true };
  }

  await db.runTransaction(async (transaction) => {
    const [approvalSnapshot, targetUserSnapshot] = await Promise.all([
      transaction.get(approval.ref),
      transaction.get(targetUser.ref),
    ]);

    if (!approvalSnapshot.exists) {
      throw new HttpsError('not-found', 'Approval was not found.');
    }

    if (!targetUserSnapshot.exists) {
      throw new HttpsError('failed-precondition', 'User profile was not found.');
    }

    const approvalData = approvalSnapshot.data();
    const targetUserData = targetUserSnapshot.data();

    if (approvalData.familyId !== profile.familyId || targetUserData.familyId !== profile.familyId) {
      throw new HttpsError('permission-denied', 'Cross-family access is forbidden.');
    }

    const currentBalance = Number(targetUserData.currentBalance) || 0;
    const totalPoints = Number(targetUserData.totalPoints) || 0;
    const taskRef = approval.taskId ? db.collection(COLLECTIONS.tasks).doc(approval.taskId) : null;
    const taskSnapshot = taskRef ? await transaction.get(taskRef) : null;
    const taskData = taskSnapshot?.exists ? taskSnapshot.data() : null;

    if (taskData) {
      if (taskData.familyId !== profile.familyId) {
        throw new HttpsError('permission-denied', 'Cross-family access is forbidden.');
      }

      assertTaskAssignedToUser(taskData, approval.userId);
      if (Boolean(taskData.isAutoRepeat) && isCompletedToday(taskData)) {
        throw new HttpsError('failed-precondition', 'Task is already completed today.');
      }
    }

    transaction.update(targetUser.ref, {
      currentBalance: currentBalance + taskPoints,
      totalPoints: totalPoints + taskPoints,
    });
    transaction.set(db.collection(COLLECTIONS.history).doc(), {
      date: new Date(),
      familyId: profile.familyId,
      label: historyLabel,
      points: taskPoints,
      type: 'earn',
      userId: approval.userId,
    });

    if (taskSnapshot?.exists && taskData) {
      if (taskData.isAutoRepeat) {
        transaction.update(taskSnapshot.ref, {
          lastCompleted: getLocalDayKey(),
          lastCompletedAt: new Date(),
        });
      } else {
        transaction.delete(taskSnapshot.ref);
      }
    }

    transaction.delete(approval.ref);
  });

  return { ok: true };
});

export const completeTaskDirect = onCall(async (request) => {
  const uid = assertAuth(request.auth);
  const profile = await requireProfile(uid);

  const taskId = normalizeString(request.data?.taskId);
  const userId = normalizeString(request.data?.userId) || uid;

  if (!taskId) {
    throw new HttpsError('invalid-argument', 'Task id is required.');
  }

  if (profile.role !== 'parent' && userId !== uid) {
    throw new HttpsError('permission-denied', 'Child can only complete their own tasks.');
  }

  const targetUser = await requireSameFamilyDocument(COLLECTIONS.users, userId, profile.familyId);
  const task = await requireSameFamilyDocument(COLLECTIONS.tasks, taskId, profile.familyId);
  const pointsValue = Math.abs(Number(task.points) || 0);
  const label = normalizeString(task.label) || 'Task Completed';

  assertTaskAssignedToUser(task, userId);

  if (!pointsValue) {
    throw new HttpsError('failed-precondition', 'Task points must be greater than zero.');
  }

  if (profile.role !== 'parent' && !task.isAutoApprove) {
    throw new HttpsError(
      'permission-denied',
      'Child can only directly complete tasks that are marked as auto-approved.',
    );
  }

  await db.runTransaction(async (transaction) => {
    const [targetUserSnapshot, taskSnapshot] = await Promise.all([
      transaction.get(targetUser.ref),
      transaction.get(task.ref),
    ]);

    if (!targetUserSnapshot.exists || !taskSnapshot.exists) {
      throw new HttpsError('failed-precondition', 'Task or user profile was not found.');
    }

    const targetUserData = targetUserSnapshot.data();
    const taskData = taskSnapshot.data();

    if (targetUserData.familyId !== profile.familyId || taskData.familyId !== profile.familyId) {
      throw new HttpsError('permission-denied', 'Cross-family access is forbidden.');
    }

    assertTaskAssignedToUser(taskData, userId);

    if (Boolean(taskData.isAutoRepeat) && isCompletedToday(taskData)) {
      throw new HttpsError('failed-precondition', 'Task is already completed today.');
    }

    const currentBalance = Number(targetUserData.currentBalance) || 0;
    const totalPoints = Number(targetUserData.totalPoints) || 0;

    transaction.update(targetUser.ref, {
      currentBalance: currentBalance + pointsValue,
      totalPoints: totalPoints + pointsValue,
    });
    transaction.set(db.collection(COLLECTIONS.history).doc(), {
      date: new Date(),
      familyId: profile.familyId,
      label,
      points: pointsValue,
      type: 'earn',
      userId,
    });

    if (taskData.isAutoRepeat) {
      transaction.update(taskSnapshot.ref, {
        lastCompleted: getLocalDayKey(),
        lastCompletedAt: new Date(),
      });
    } else {
      transaction.delete(taskSnapshot.ref);
    }
  });

  return { ok: true };
});

export const upsertCatalogItem = onCall(async (request) => {
  const uid = assertAuth(request.auth);
  const profile = await requireProfile(uid);
  assertRole(profile, 'parent');

  const itemId = normalizeString(request.data?.itemId);
  const itemPayload = mapCatalogPayload(request.data?.item, profile.familyId);

  if (itemId) {
    const itemRef = db.collection(COLLECTIONS.catalog).doc(itemId);
    const existingSnapshot = await itemRef.get();

    if (existingSnapshot.exists) {
      const existingItem = existingSnapshot.data();
      if (existingItem.familyId !== profile.familyId) {
        throw new HttpsError('permission-denied', 'Cross-family access is forbidden.');
      }

      await itemRef.set(itemPayload, { merge: true });
      return { id: itemId, ...itemPayload };
    }

    await itemRef.set(itemPayload);
    return { id: itemId, ...itemPayload };
  }

  const defaultId = `${itemPayload.type}_${Date.now()}`;
  await db.collection(COLLECTIONS.catalog).doc(defaultId).set(itemPayload);
  return { id: defaultId, ...itemPayload };
});

export const deleteCatalogItem = onCall(async (request) => {
  const uid = assertAuth(request.auth);
  const profile = await requireProfile(uid);
  assertRole(profile, 'parent');

  const itemId = normalizeString(request.data?.itemId);
  if (!itemId) {
    throw new HttpsError('invalid-argument', 'Catalog item id is required.');
  }

  const item = await requireSameFamilyDocument(COLLECTIONS.catalog, itemId, profile.familyId);
  await item.ref.delete();

  return { ok: true };
});

export const activateAchievement = onCall(async (request) => {
  const uid = assertAuth(request.auth);
  const profile = await requireProfile(uid);

  const achievementId = normalizeString(request.data?.achievementId);
  const targetUserId = normalizeString(request.data?.userId) || uid;
  if (!achievementId) {
    throw new HttpsError('invalid-argument', 'Achievement id is required.');
  }

  if (profile.role !== 'parent' && targetUserId !== uid) {
    throw new HttpsError('permission-denied', 'Child can only activate their own achievements.');
  }

  const achievement = await requireSameFamilyDocument(COLLECTIONS.catalog, achievementId, profile.familyId);
  const targetUser = await requireSameFamilyDocument(COLLECTIONS.users, targetUserId, profile.familyId);
  const threshold = Number(achievement.threshold) || 0;
  const totalPoints = Number(targetUser.totalPoints) || 0;

  if (achievement.type !== 'title') {
    throw new HttpsError('failed-precondition', 'Only title achievements can be activated.');
  }

  if (totalPoints < threshold) {
    throw new HttpsError('failed-precondition', 'Achievement threshold is not reached yet.');
  }

  await targetUser.ref.update({
    activatedAchievements: FieldValue.arrayUnion(achievementId),
  });

  return { ok: true };
});

export const upsertFamilyMember = onCall(async (request) => {
  const uid = assertAuth(request.auth);
  const profile = await requireProfile(uid);
  assertRole(profile, 'parent');

  const memberId = normalizeString(request.data?.memberId);
  const name = normalizeString(request.data?.name);
  const avatar = sanitizeOptionalString(request.data?.avatar) || '👶';
  const role = normalizeString(request.data?.role);

  if (!name) {
    throw new HttpsError('invalid-argument', 'Member name is required.');
  }

  if (!['child', 'parent'].includes(role)) {
    throw new HttpsError('invalid-argument', 'Unsupported member role.');
  }

  if (memberId) {
    const member = await requireSameFamilyDocument(COLLECTIONS.users, memberId, profile.familyId);
    await member.ref.update({ avatar, name, role });
    return { id: memberId, avatar, familyId: profile.familyId, name, role };
  }

  const newMemberId = `${role}_${Date.now()}`;
  const newMember = {
    avatar,
    currentBalance: 0,
    familyId: profile.familyId,
    name,
    role,
    totalPoints: 0,
  };

  await db.collection(COLLECTIONS.users).doc(newMemberId).set(newMember);

  return { id: newMemberId, ...newMember };
});

export const deleteFamilyMember = onCall(async (request) => {
  const uid = assertAuth(request.auth);
  const profile = await requireProfile(uid);
  assertRole(profile, 'parent');

  const memberId = normalizeString(request.data?.memberId);
  if (!memberId) {
    throw new HttpsError('invalid-argument', 'Member id is required.');
  }

  if (memberId === uid) {
    throw new HttpsError('failed-precondition', 'Parent cannot delete themselves here.');
  }

  const member = await requireSameFamilyDocument(COLLECTIONS.users, memberId, profile.familyId);
  await member.ref.delete();

  return { ok: true };
});
