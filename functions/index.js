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

const mapTaskPayload = (task, familyId) => {
  const label = normalizeString(task?.label);
  if (!label) {
    throw new HttpsError('invalid-argument', 'Task label is required.');
  }

  const points = Number(task?.points);
  if (!Number.isFinite(points)) {
    throw new HttpsError('invalid-argument', 'Task points must be a number.');
  }

  const assignedTo = normalizeString(task?.assignedTo) || 'all';
  const durationValue = Number(task?.duration);

  return {
    assignedTo,
    duration: Number.isFinite(durationValue) && durationValue > 0 ? durationValue : null,
    familyId,
    icon: sanitizeOptionalString(task?.icon) || '📝',
    isAutoApprove: Boolean(task?.isAutoApprove),
    isAutoPayout: Boolean(task?.isAutoPayout),
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
  if (!Number.isFinite(threshold)) {
    throw new HttpsError('invalid-argument', 'Catalog threshold must be numeric.');
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
  await task.ref.delete();

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

  const batch = db.batch();
  let deletedCount = 0;

  snapshot.docs.forEach((taskSnapshot) => {
    const task = taskSnapshot.data();
    const belongsToChild = task.assignedTo === selectedChildId || task.assignedTo === 'all';
    if (belongsToChild && !task.isAutoRepeat) {
      batch.delete(taskSnapshot.ref);
      deletedCount += 1;
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

  const label = normalizeString(request.data?.label);
  const points = Number(request.data?.points);
  const status = normalizeString(request.data?.status) || 'pending';
  const icon = sanitizeOptionalString(request.data?.icon) || '📝';
  const taskId = sanitizeOptionalString(request.data?.taskId);
  const requestedUserId = normalizeString(request.data?.userId) || uid;

  if (!label) {
    throw new HttpsError('invalid-argument', 'Approval label is required.');
  }

  if (!Number.isFinite(points)) {
    throw new HttpsError('invalid-argument', 'Approval points must be numeric.');
  }

  if (!['pending', 'in_progress'].includes(status)) {
    throw new HttpsError('invalid-argument', 'Unsupported approval status.');
  }

  if (requestedUserId !== uid) {
    assertRole(profile, 'parent');
  }

  await requireSameFamilyDocument(COLLECTIONS.users, requestedUserId, profile.familyId);

  const approval = {
    createdAt: new Date().toISOString(),
    familyId: profile.familyId,
    icon,
    label,
    points,
    status,
    taskId,
    userId: requestedUserId,
  };

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
    approval.userId === uid && approval.status === 'in_progress' && Number(approval.points) > 0;

  if (!isParent && !canSettleOwnProgress) {
    throw new HttpsError('permission-denied', 'You are not allowed to settle this approval.');
  }

  const targetUser = await requireSameFamilyDocument(COLLECTIONS.users, approval.userId, profile.familyId);
  const task = approval.taskId
    ? await requireSameFamilyDocument(COLLECTIONS.tasks, approval.taskId, profile.familyId).catch(() => null)
    : null;

  const pointsValue = Number(approval.points) || 0;
  const isPurchase = pointsValue < 0;
  const balanceDelta = isPurchase ? -Math.abs(pointsValue) : Math.abs(pointsValue);
  const batch = db.batch();

  if (isPurchase) {
    batch.update(targetUser.ref, {
      currentBalance: FieldValue.increment(balanceDelta),
    });
  } else {
    batch.update(targetUser.ref, {
      currentBalance: FieldValue.increment(balanceDelta),
      totalPoints: FieldValue.increment(balanceDelta),
    });
  }

  const historyRef = db.collection(COLLECTIONS.history).doc();
  batch.set(historyRef, {
    date: new Date(),
    familyId: profile.familyId,
    label: approval.label,
    points: balanceDelta,
    type: isPurchase ? 'spend' : 'earn',
    userId: approval.userId,
  });

  if (task) {
    if (task.isAutoRepeat) {
      batch.update(task.ref, {
        lastCompleted: getLocalDayKey(),
        lastCompletedAt: new Date(),
      });
    } else {
      batch.delete(task.ref);
    }
  }

  batch.delete(approval.ref);
  await batch.commit();

  return { ok: true };
});

export const completeTaskDirect = onCall(async (request) => {
  const uid = assertAuth(request.auth);
  const profile = await requireProfile(uid);

  const taskId = normalizeString(request.data?.taskId);
  const userId = normalizeString(request.data?.userId) || uid;
  const pointsValue = Math.abs(Number(request.data?.points) || 0);
  const label = normalizeString(request.data?.label) || 'Task Completed';

  if (!taskId) {
    throw new HttpsError('invalid-argument', 'Task id is required.');
  }

  if (!pointsValue) {
    throw new HttpsError('invalid-argument', 'Task points must be greater than zero.');
  }

  if (profile.role !== 'parent' && userId !== uid) {
    throw new HttpsError('permission-denied', 'Child can only complete their own tasks.');
  }

  const targetUser = await requireSameFamilyDocument(COLLECTIONS.users, userId, profile.familyId);
  const task = await requireSameFamilyDocument(COLLECTIONS.tasks, taskId, profile.familyId);
  const batch = db.batch();

  batch.update(targetUser.ref, {
    currentBalance: FieldValue.increment(pointsValue),
    totalPoints: FieldValue.increment(pointsValue),
  });

  batch.set(db.collection(COLLECTIONS.history).doc(), {
    date: new Date(),
    familyId: profile.familyId,
    label,
    points: pointsValue,
    type: 'earn',
    userId,
  });

  if (task.isAutoRepeat) {
    batch.update(task.ref, {
      lastCompleted: getLocalDayKey(),
      lastCompletedAt: new Date(),
    });
  } else {
    batch.delete(task.ref);
  }

  await batch.commit();

  return { ok: true };
});

export const upsertCatalogItem = onCall(async (request) => {
  const uid = assertAuth(request.auth);
  const profile = await requireProfile(uid);
  assertRole(profile, 'parent');

  const itemId = normalizeString(request.data?.itemId);
  const itemPayload = mapCatalogPayload(request.data?.item, profile.familyId);

  if (itemId) {
    const existingItem = await requireSameFamilyDocument(COLLECTIONS.catalog, itemId, profile.familyId);
    await existingItem.ref.set(itemPayload, { merge: true });
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
