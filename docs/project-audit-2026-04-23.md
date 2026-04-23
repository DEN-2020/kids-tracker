# Kids Tracker audit - 2026-04-23

## Scope

- Workspace reviewed in its current local state, including existing uncommitted changes.
- Firebase Hosting configuration, React/TypeScript app code, and basic delivery workflow were checked.
- Verification run locally:
  - `npm run lint`
  - `npm run build`

## Current snapshot

- The app builds and lints successfully in the current workspace.
- Firebase Hosting is configured with SPA rewrites via `firebase.json`.
- There is no repository CI workflow yet in the audited state.
- Deployment/process docs are outdated relative to the current codebase and Firebase setup.
- The repo currently contains many local uncommitted changes, so the audit reflects "current working state", not a clean release tag.

## Priority map

### P0 - Data isolation and Firebase governance

1. Family isolation is not modeled consistently across collections.
   - `tasks_list` tasks are keyed only by `assignedTo`; they do not store `familyId`.
   - `history` records do not store `familyId`.
   - `achievements_list` is read as a global collection.
   - Relevant files:
     - `src/AuthenticatedApp.tsx`
     - `src/components/Admin/AdminPanel.tsx`
     - `src/services/database.tsx`

2. Client code subscribes to broad collections and filters on the client.
   - `src/AuthenticatedApp.tsx` reads the full `tasks_list` collection.
   - `src/components/Admin/AdminPanel.tsx` reads all `tasks_list`, all `approvals`, and all `users`.
   - In a multi-family product this is the main architectural risk, because it makes data separation depend on frontend filtering instead of hard data boundaries.

3. Firebase rules/indexes are not versioned in the repo.
   - `firebase.json` configures Hosting only.
   - No `firestore.rules`, `storage.rules`, or `firestore.indexes.json` files are present.
   - That means production security and query behavior are not reproducible from git.

4. Authorization and privileged mutations are client-authoritative.
   - Registration lets the browser choose `familyId` and `role` before writing the user profile.
   - Balance, approval settlement, history, and avatar flows are executed directly from the browser.
   - This is difficult to secure safely with frontend-only trust, especially for parent/admin capabilities.
   - Relevant files:
     - `src/components/Auth/RegisterPage.tsx`
     - `src/services/database.tsx`
     - `src/components/Admin/AdminPanel.tsx`
     - `src/services/storage.ts`

### P1 - Product logic gaps affecting real behavior

1. Family join flow is documented and surfaced in UI, but not implemented in registration.
   - `src/components/Admin/FamilySettings.tsx` generates `?join=<familyId>` links.
   - `README.md` documents automatic family joining via invite links.
   - `src/components/Auth/RegisterPage.tsx` never reads `window.location.search`, so join links do not auto-fill or auto-join anything.
   - Free-form family code entry is also never validated before account creation.

2. Spend history is calculated with the wrong sign in stats.
   - Shop purchase approvals are stored with negative `points`.
   - Admin approval keeps that negative value and writes `type: 'spend'` to history.
   - `src/components/Stats.tsx` negates `spend` values again, so spending can show up as positive chart movement and double-minus values in recent logs.
   - Relevant files:
     - `src/components/Kids/Shop.tsx`
     - `src/components/Admin/AdminPanel.tsx`
     - `src/components/Stats.tsx`

3. Daily completion tracking uses inconsistent date logic.
   - `src/services/database.tsx` writes `lastCompleted` using `toLocaleDateString('sv-SE')`.
   - `src/components/Kids/TaskList.tsx` compares against local `toLocaleDateString('sv-SE')`.
   - `src/components/Admin/AdminPanel.tsx` compares against `new Date().toISOString().split('T')[0]`.
   - This can shift "today" around timezone boundaries and make parent/child views disagree.

4. The "task timer" feature is not complete.
   - `src/AuthenticatedApp.tsx` stores `runningTimer`.
   - `src/components/Kids/TaskList.tsx` displays the timer and can start it.
   - There is no countdown effect that decrements `timeLeft` or clears the timer when it reaches zero.
   - README currently advertises built-in task timers, but the current implementation is only partial UI state.

### P2 - Identity, lifecycle, and workflow issues

1. Manual member creation bypasses authentication entirely.
   - `src/components/Admin/FamilySettings.tsx` creates synthetic user documents like `child_<timestamp>` directly in Firestore.
   - Those records are not tied to Firebase Auth users, which creates account lifecycle and ownership ambiguity.

2. Account deletion is not robust.
   - `src/components/Admin/FamilySettings.tsx` deletes the Firestore user document first, then attempts `auth.currentUser?.delete()`.
   - If Firebase requires recent re-authentication, the auth deletion can fail after the profile document is already gone.

3. Stats localization has an English-path bug.
   - `src/components/Stats.tsx` uses `fi-FI` for Finnish and `ru-RU` for everything else, so English falls back to Russian date formatting.

4. Input and upload validation are thin.
   - Admin numeric inputs can write empty, negative, or invalid values into tasks, rewards, thresholds, and exchange settings.
   - Avatar upload only relies on `accept="image/*"` and does not validate file size or MIME type before upload.

5. There is no automated test harness.
   - No `test` script or test dependencies are configured in `package.json`.
   - The join flow, spend math, task approval states, and date logic are currently unprotected by automation.

6. Docs and scripts still reflect an older delivery model.
   - `README.md` says React 18, while `package.json` uses React 19.
   - `package.json` still exposes `gh-pages` deploy scripts even though the project now carries Firebase Hosting config.
   - There was no CI verification workflow before this audit update.

7. Runtime hardening is still light for production/shared-device use.
   - Firestore persistent multi-tab cache is enabled for everyone.
   - I do not see App Check initialization.
   - Firebase Hosting config currently adds cache headers, but not baseline security headers such as CSP, `Referrer-Policy`, or `X-Content-Type-Options`.

## Recommended repair order

1. Lock down Firebase as code.
   - Add versioned Firestore rules, Storage rules, and indexes.
   - Define the intended data isolation model before making more feature changes.
   - Decide which mutations must move to Cloud Functions or another trusted backend.

2. Add `familyId` (or a stronger tenant key) everywhere it matters.
   - At minimum: `tasks_list`, `approvals`, `history`, and any shared catalog content that should be scoped.
   - Update queries to fetch only tenant-scoped data from Firestore.

3. Fix onboarding and daily-state correctness.
   - Implement the `?join=` flow in registration.
   - Validate family codes before writing a new user profile.
   - Correct spend/history sign handling in stats.
   - Replace mixed date string logic with one canonical day key strategy.

4. Fix incomplete or misleading product features.
   - Either implement the real countdown timer or remove timer claims from UX/docs.
   - Clean up manual account/member lifecycle behavior.
   - Add minimum runtime validation for numeric admin inputs and avatar uploads.

5. Refresh operational docs after the data model is stabilized.
   - Update README to match the current stack, deployment path, and known limitations.
   - Add runtime hardening items: App Check decision, shared-device cache policy, and hosting security headers.

## Workflow update applied in this audit

- Added `npm run verify` to standardize local/repo verification.
- Added GitHub Actions workflow `.github/workflows/verify.yml` to run install + lint + build on push/PR.

## Suggested next implementation batch

1. Introduce versioned Firebase rules and commit them.
2. Add tenant/family scoping to data writes and queries.
3. Implement invite-link onboarding.
4. Repair timer/date logic.
5. Update README after the above land.
