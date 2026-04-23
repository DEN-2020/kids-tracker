# Family `familyId` rollout and migration

This document covers the Firestore backfill for legacy documents that may be missing `familyId` in:

- `tasks_list`
- `approvals`
- `history`
- `achievements_list`

The backfill script is [`scripts/firebase-backfill-familyId.mjs`](../scripts/firebase-backfill-familyId.mjs).

## What the script does

- Runs in `dry-run` mode by default.
- Resolves `familyId` from linked user documents first.
- Falls back to already-scoped related documents such as `tasks_list` and `approvals`.
- Writes only missing `familyId` values.
- Skips documents with conflicting or ambiguous ownership instead of guessing.
- Prints a summary with planned updates, unresolved docs, ambiguous matches, and conflicts.

## Environment config

The script uses Firebase Admin SDK credentials from one of these sources:

- `FIREBASE_SERVICE_ACCOUNT_JSON`
  - Raw service-account JSON in an environment variable.
- `FIREBASE_SERVICE_ACCOUNT_PATH`
  - Path to a service-account JSON file.
- `GOOGLE_APPLICATION_CREDENTIALS`
  - Standard ADC service-account path used by Google tooling.

Optional project selection:

- `FIREBASE_PROJECT_ID`
- `GOOGLE_CLOUD_PROJECT`
- `GCLOUD_PROJECT`

Optional family fallback for legacy global documents with no resolvable references:

- `BACKFILL_DEFAULT_FAMILY_ID`
- `--default-family-id=<familyId>`

If no project id is passed on the command line, the script uses the first non-empty value above.

## Rollout

### 1. Backup

Take a Firestore backup before any apply step.

Recommended options:

- Firebase Console export if that is already part of your ops flow.
- `gcloud firestore export` to a storage bucket if your environment already uses Google Cloud tooling.

The important part is having a restore point before the first write.

### 2. Dry run

Run the script without `--apply` first.

Example:

```bash
node scripts/firebase-backfill-familyId.mjs
```

If the project has multiple families and you know that a legacy global catalog/task set belongs to one family, use:

```bash
node scripts/firebase-backfill-familyId.mjs --default-family-id=fam_abc123
```

Review:

- Planned updates
- Unresolved docs
- Ambiguous docs
- Conflicts where an existing `familyId` does not match the resolved one

Do not move to apply until the dry-run output looks consistent with the data model.

### 3. Apply

When the dry run looks correct, run the same script with `--apply`.

Example:

```bash
node scripts/firebase-backfill-familyId.mjs --apply
```

Or with an explicit fallback family:

```bash
node scripts/firebase-backfill-familyId.mjs --apply --default-family-id=fam_abc123
```

The script performs merge writes only for missing `familyId` values.

### 4. Verify

Verify the result in two ways:

- Re-run the script in dry-run mode and confirm that planned updates drop to zero.
- Spot-check Firestore queries or the app UI for each collection:
  - `tasks_list where familyId == ...`
  - `approvals where familyId == ...`
  - `history where familyId == ...`
  - `achievements_list where familyId == ...`

If the UI relies on family-scoped queries, confirm the relevant views still load data after the migration.

### 5. Rollback caveats

Rollback is not automatic.

- The script does not store previous document values.
- It only writes `familyId`, so reverting by hand means either restoring from backup or selectively clearing fields.
- If a document was written with the wrong `familyId`, the safest rollback is restore-from-backup, not another forward migration.
- If you discover unresolved or ambiguous docs after apply, fix the data source first and then rerun a targeted backfill.

## Operational notes

- Keep the script dry-run by default.
- Do not override an existing `familyId` unless you have validated the conflict by hand.
- Treat ambiguous docs as manual-review cases.
- If the workspace does not already have `firebase-admin` installed where the script can resolve it, install the dependency in the Firebase/Admin environment before running the migration.
