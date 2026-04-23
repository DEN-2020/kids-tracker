import { createRequire } from 'node:module';
import process from 'node:process';

const requireFromFunctions = createRequire(new URL('../functions/package.json', import.meta.url));
const requireFromRoot = createRequire(import.meta.url);

const loadModule = (specifier) => {
  try {
    return requireFromFunctions(specifier);
  } catch (functionsError) {
    try {
      return requireFromRoot(specifier);
    } catch (rootError) {
      const hint = [
        `Unable to load "${specifier}".`,
        'Install firebase-admin in the functions workspace or the repo root before running this script.',
      ].join(' ');
      const error = new Error(hint);
      error.cause = rootError;
      throw error;
    }
  }
};

const { initializeApp, cert, applicationDefault } = loadModule('firebase-admin/app');
const {
  collection,
  documentId,
  getFirestore,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
} = loadModule('firebase-admin/firestore');

const COLLECTIONS = {
  users: 'users',
  tasks: 'tasks_list',
  approvals: 'approvals',
  history: 'history',
  achievements: 'achievements_list',
};

const DEFAULT_PAGE_SIZE = 400;
const WRITE_BATCH_LIMIT = 400;
const SAMPLE_LIMIT = 10;

const parseArgs = (argv) => {
  const options = {
    apply: false,
    defaultFamilyId: normalizeString(process.env.BACKFILL_DEFAULT_FAMILY_ID),
    pageSize: DEFAULT_PAGE_SIZE,
    projectId: normalizeString(process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--apply') {
      options.apply = true;
      continue;
    }

    if (arg === '--dry-run') {
      options.apply = false;
      continue;
    }

    if (arg === '--project') {
      options.projectId = normalizeString(argv[index + 1]);
      index += 1;
      continue;
    }

    if (arg.startsWith('--project=')) {
      options.projectId = normalizeString(arg.slice('--project='.length));
      continue;
    }

    if (arg === '--page-size') {
      const next = Number(argv[index + 1]);
      if (Number.isFinite(next) && next > 0) {
        options.pageSize = Math.min(1000, Math.floor(next));
      }
      index += 1;
      continue;
    }

    if (arg.startsWith('--page-size=')) {
      const next = Number(arg.slice('--page-size='.length));
      if (Number.isFinite(next) && next > 0) {
        options.pageSize = Math.min(1000, Math.floor(next));
      }
      continue;
    }

    if (arg === '--default-family-id') {
      options.defaultFamilyId = normalizeString(argv[index + 1]);
      index += 1;
      continue;
    }

    if (arg.startsWith('--default-family-id=')) {
      options.defaultFamilyId = normalizeString(arg.slice('--default-family-id='.length));
    }
  }

  return options;
};

const normalizeString = (value) => (typeof value === 'string' ? value.trim() : '');

const unique = (values) => [...new Set(values.filter(Boolean))];

const asArray = (value) => {
  if (Array.isArray(value)) {
    return value;
  }

  return value === undefined || value === null ? [] : [value];
};

const getServiceAccountConfig = () => {
  const rawJson = normalizeString(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  if (rawJson) {
    const serviceAccount = JSON.parse(rawJson);
    return {
      credential: cert(serviceAccount),
      projectId: normalizeString(serviceAccount.project_id),
    };
  }

  const rawPath = normalizeString(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
  if (rawPath) {
    const fs = requireFromRoot('node:fs');
    const path = requireFromRoot('node:path');
    const resolvedPath = path.isAbsolute(rawPath) ? rawPath : path.resolve(process.cwd(), rawPath);
    const serviceAccount = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
    return {
      credential: cert(serviceAccount),
      projectId: normalizeString(serviceAccount.project_id),
    };
  }

  return {
    credential: applicationDefault(),
    projectId: '',
  };
};

const scanCollection = async (db, collectionName, pageSize) => {
  const docs = [];
  let lastDoc = null;

  while (true) {
    const baseQuery = query(collection(db, collectionName), orderBy(documentId()), limit(pageSize));
    const nextQuery = lastDoc ? query(collection(db, collectionName), orderBy(documentId()), startAfter(lastDoc), limit(pageSize)) : baseQuery;
    const snapshot = await getDocs(nextQuery);

    if (snapshot.empty) {
      break;
    }

    docs.push(...snapshot.docs);
    lastDoc = snapshot.docs[snapshot.docs.length - 1];

    if (snapshot.docs.length < pageSize) {
      break;
    }
  }

  return docs;
};

const createSummaryBucket = (collectionName) => ({
  collectionName,
  applied: 0,
  alreadyScoped: 0,
  unresolved: 0,
  ambiguous: 0,
  conflicts: 0,
  planned: 0,
  unresolvedSamples: [],
  ambiguousSamples: [],
  conflictSamples: [],
  updateSamples: [],
});

const pushSample = (bucket, key, value) => {
  if (bucket[key].length < SAMPLE_LIMIT) {
    bucket[key].push(value);
  }
};

const loadFamilyMaps = async (db, pageSize) => {
  const familyIdByUserId = new Map();
  const familyIdByTaskId = new Map();
  const familyIdByApprovalId = new Map();
  const knownFamilyIds = new Set();

  const userDocs = await scanCollection(db, COLLECTIONS.users, pageSize);
  for (const userDoc of userDocs) {
    const data = userDoc.data();
    const familyId = normalizeString(data.familyId);
    if (familyId) {
      familyIdByUserId.set(userDoc.id, familyId);
      knownFamilyIds.add(familyId);
    }
  }

  return {
    familyIdByApprovalId,
    familyIdByTaskId,
    familyIdByUserId,
    knownFamilyIds: [...knownFamilyIds],
  };
};

const resolveFamilyId = (doc, maps, defaultFamilyId) => {
  const data = doc.data();
  const referenceCandidates = [];

  const inspect = (fieldName, value, resolver, skipAll = false) => {
    for (const candidate of asArray(value)) {
      const normalizedCandidate = normalizeString(candidate);
      if (!normalizedCandidate || (skipAll && normalizedCandidate === 'all')) {
        continue;
      }

      const resolvedFamilyId = resolver(normalizedCandidate);
      if (resolvedFamilyId) {
        referenceCandidates.push({
          familyId: resolvedFamilyId,
          source: `${fieldName}=${normalizedCandidate}`,
        });
      }
    }
  };

  if (doc.ref.parent.id === COLLECTIONS.tasks) {
    inspect('assignedTo', data.assignedTo, (value) => maps.familyIdByUserId.get(value), true);
    inspect('userId', data.userId, (value) => maps.familyIdByUserId.get(value));
    inspect('ownerId', data.ownerId, (value) => maps.familyIdByUserId.get(value));
    inspect('createdBy', data.createdBy, (value) => maps.familyIdByUserId.get(value));
    inspect('createdByUid', data.createdByUid, (value) => maps.familyIdByUserId.get(value));
    inspect('authorId', data.authorId, (value) => maps.familyIdByUserId.get(value));
    inspect('memberId', data.memberId, (value) => maps.familyIdByUserId.get(value));
  } else if (doc.ref.parent.id === COLLECTIONS.approvals) {
    inspect('userId', data.userId, (value) => maps.familyIdByUserId.get(value));
    inspect('requestedUserId', data.requestedUserId, (value) => maps.familyIdByUserId.get(value));
    inspect('targetUserId', data.targetUserId, (value) => maps.familyIdByUserId.get(value));
    inspect('memberId', data.memberId, (value) => maps.familyIdByUserId.get(value));
    inspect('ownerId', data.ownerId, (value) => maps.familyIdByUserId.get(value));
    inspect('createdBy', data.createdBy, (value) => maps.familyIdByUserId.get(value));
    inspect('taskId', data.taskId, (value) => maps.familyIdByTaskId.get(value));
  } else if (doc.ref.parent.id === COLLECTIONS.history) {
    inspect('userId', data.userId, (value) => maps.familyIdByUserId.get(value));
    inspect('targetUserId', data.targetUserId, (value) => maps.familyIdByUserId.get(value));
    inspect('memberId', data.memberId, (value) => maps.familyIdByUserId.get(value));
    inspect('actorId', data.actorId, (value) => maps.familyIdByUserId.get(value));
    inspect('ownerId', data.ownerId, (value) => maps.familyIdByUserId.get(value));
    inspect('createdBy', data.createdBy, (value) => maps.familyIdByUserId.get(value));
    inspect('approvalId', data.approvalId, (value) => maps.familyIdByApprovalId.get(value));
    inspect('taskId', data.taskId, (value) => maps.familyIdByTaskId.get(value));
  } else if (doc.ref.parent.id === COLLECTIONS.achievements) {
    inspect('userId', data.userId, (value) => maps.familyIdByUserId.get(value));
    inspect('ownerId', data.ownerId, (value) => maps.familyIdByUserId.get(value));
    inspect('createdBy', data.createdBy, (value) => maps.familyIdByUserId.get(value));
    inspect('authorId', data.authorId, (value) => maps.familyIdByUserId.get(value));
    inspect('memberId', data.memberId, (value) => maps.familyIdByUserId.get(value));
    inspect('taskId', data.taskId, (value) => maps.familyIdByTaskId.get(value));
    inspect('approvalId', data.approvalId, (value) => maps.familyIdByApprovalId.get(value));
  }

  const families = unique(referenceCandidates.map((candidate) => candidate.familyId));
  const existingFamilyId = normalizeString(data.familyId);

  if (families.length === 1) {
    const selected = referenceCandidates.find((candidate) => candidate.familyId === families[0]) || referenceCandidates[0];
    return {
      familyId: families[0],
      reason: selected?.source || 'reference match',
    };
  }

  if (families.length > 1) {
    return {
      ambiguousFamilies: families,
      reason: referenceCandidates.map((candidate) => candidate.source).join(', '),
    };
  }

  if (existingFamilyId) {
    return {
      existingFamilyId,
      familyId: existingFamilyId,
      reason: 'existing familyId',
    };
  }

  if (defaultFamilyId) {
    return {
      familyId: defaultFamilyId,
      reason: 'default family override',
    };
  }

  if (maps.knownFamilyIds.length === 1) {
    return {
      familyId: maps.knownFamilyIds[0],
      reason: 'single family project fallback',
    };
  }

  return {
    familyId: '',
    reason: 'no resolvable references',
  };
};

const writeDocUpdates = async (db, collectionName, docs, maps, isDryRun, defaultFamilyId) => {
  const summary = createSummaryBucket(collectionName);
  let batch = db.batch();
  let batchSize = 0;

  const commitBatch = async () => {
    if (!isDryRun && batchSize > 0) {
      await batch.commit();
    }
    batch = db.batch();
    batchSize = 0;
  };

  for (const doc of docs) {
    const resolved = resolveFamilyId(doc, maps, defaultFamilyId);
    const currentFamilyId = normalizeString(doc.data().familyId);

    if (currentFamilyId) {
      summary.alreadyScoped += 1;
      if (resolved.familyId && resolved.familyId !== currentFamilyId) {
        summary.conflicts += 1;
        pushSample(summary, 'conflictSamples', `${doc.id}: existing=${currentFamilyId}, resolved=${resolved.familyId}`);
      }
      if (collectionName === COLLECTIONS.tasks) {
        maps.familyIdByTaskId.set(doc.id, currentFamilyId);
      } else if (collectionName === COLLECTIONS.approvals) {
        maps.familyIdByApprovalId.set(doc.id, currentFamilyId);
      }
      continue;
    }

    if (resolved.ambiguousFamilies?.length) {
      summary.ambiguous += 1;
      pushSample(summary, 'ambiguousSamples', `${doc.id}: ${resolved.ambiguousFamilies.join(', ')} (${resolved.reason})`);
      continue;
    }

    if (!resolved.familyId) {
      summary.unresolved += 1;
      pushSample(summary, 'unresolvedSamples', `${doc.id}: ${resolved.reason}`);
      continue;
    }

    summary.planned += 1;
    pushSample(summary, 'updateSamples', `${doc.id} -> ${resolved.familyId} (${resolved.reason})`);

    if (isDryRun) {
      continue;
    }

    batch.set(doc.ref, { familyId: resolved.familyId }, { merge: true });
    batchSize += 1;

    if (collectionName === COLLECTIONS.tasks) {
      maps.familyIdByTaskId.set(doc.id, resolved.familyId);
    } else if (collectionName === COLLECTIONS.approvals) {
      maps.familyIdByApprovalId.set(doc.id, resolved.familyId);
    }

    if (batchSize >= WRITE_BATCH_LIMIT) {
      await commitBatch();
    }
  }

  await commitBatch();

  summary.applied = isDryRun ? 0 : summary.planned;

  return summary;
};

const printSummary = ({ dryRun, pageSize, projectId, summaries }) => {
  console.log('');
  console.log(`Mode: ${dryRun ? 'dry-run' : 'apply'}`);
  console.log(`Page size: ${pageSize}`);
  console.log(`Project: ${projectId || '(from ADC/service account)'}`);
  console.log('');

  for (const summary of summaries) {
    console.log(`[${summary.collectionName}] planned=${summary.planned} applied=${summary.applied} alreadyScoped=${summary.alreadyScoped} unresolved=${summary.unresolved} ambiguous=${summary.ambiguous} conflicts=${summary.conflicts}`);

    if (summary.updateSamples.length > 0) {
      console.log(`  updates: ${summary.updateSamples.join(' | ')}`);
    }

    if (summary.unresolvedSamples.length > 0) {
      console.log(`  unresolved: ${summary.unresolvedSamples.join(' | ')}`);
    }

    if (summary.ambiguousSamples.length > 0) {
      console.log(`  ambiguous: ${summary.ambiguousSamples.join(' | ')}`);
    }

    if (summary.conflictSamples.length > 0) {
      console.log(`  conflicts: ${summary.conflictSamples.join(' | ')}`);
    }
  }
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  const dryRun = !options.apply;

  const serviceAccountConfig = getServiceAccountConfig();
  const effectiveProjectId = options.projectId || serviceAccountConfig.projectId;
  const appOptions = {
    credential: serviceAccountConfig.credential,
  };

  if (effectiveProjectId) {
    appOptions.projectId = effectiveProjectId;
  }

  initializeApp(appOptions);
  const db = getFirestore();

  const maps = await loadFamilyMaps(db, options.pageSize);
  const taskDocs = await scanCollection(db, COLLECTIONS.tasks, options.pageSize);
  const approvalDocs = await scanCollection(db, COLLECTIONS.approvals, options.pageSize);
  const historyDocs = await scanCollection(db, COLLECTIONS.history, options.pageSize);
  const achievementDocs = await scanCollection(db, COLLECTIONS.achievements, options.pageSize);

  const summaries = [];
  summaries.push(await writeDocUpdates(db, COLLECTIONS.tasks, taskDocs, maps, dryRun, options.defaultFamilyId));
  summaries.push(await writeDocUpdates(db, COLLECTIONS.approvals, approvalDocs, maps, dryRun, options.defaultFamilyId));
  summaries.push(await writeDocUpdates(db, COLLECTIONS.history, historyDocs, maps, dryRun, options.defaultFamilyId));
  summaries.push(await writeDocUpdates(db, COLLECTIONS.achievements, achievementDocs, maps, dryRun, options.defaultFamilyId));

  printSummary({
    dryRun,
    pageSize: options.pageSize,
    projectId: effectiveProjectId,
    summaries,
  });

  const totalPlanned = summaries.reduce((acc, item) => acc + item.planned, 0);
  const totalUnresolved = summaries.reduce((acc, item) => acc + item.unresolved, 0);
  const totalAmbiguous = summaries.reduce((acc, item) => acc + item.ambiguous, 0);
  const totalConflicts = summaries.reduce((acc, item) => acc + item.conflicts, 0);

  console.log('');
  console.log(`Totals: planned=${totalPlanned} applied=${dryRun ? 0 : totalPlanned} unresolved=${totalUnresolved} ambiguous=${totalAmbiguous} conflicts=${totalConflicts}`);
  console.log(dryRun ? 'No writes were performed.' : 'Writes have been applied.');
};

main().catch((error) => {
  console.error('familyId backfill failed:');
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exitCode = 1;
});
