# Kids Tracker 🚀

**A Gamified Motivation & Task Management System for Modern Families**

Kids Tracker is a web application designed to turn daily chores into an engaging adventure. By completing tasks, children earn points that they can trade for real-world rewards or money through a controlled shop environment.

---

## 🛠 Tech Stack

- **Frontend:** React 18 with Vite
- **Language:** TypeScript (Strict Mode)
- **Backend:** Firebase (Firestore NoSQL, Auth, Storage)
- **State Management:** React Hooks (useState, useEffect, useCallback)
- **Real-time:** Firestore OnSnapshot for instant data syncing
- **Audio API:** HTML5 Audio for interactive feedback

---

## 🌟 Key Features

### 👦 Kid's Experience

- **Task Management:** View assigned tasks with icons, points, and durations.
- **Hold-to-Confirm:** A unique 5-second hold mechanic to prevent accidental completions, featuring a visual progress bar and audio cues.
- **Task Timers:** Built-in countdown timers for time-sensitive chores.
- **Personal Shop:** Exchange balance for custom rewards or convert points to currency (Euro).
- **Profile Customization:** Upload and change avatars directly from the app (stored in Firebase Storage).

### 🧔 Parent's Control (Admin Panel)

- **Multi-Child Support:** Seamlessly switch between family members to track individual progress.
- **Parental Override:** Instant task approval or shop purchases via a confirmation bypass for parents.
- **Family Linking:** Automatic family joining via unique invite links (`?join=CODE`).
- **Comprehensive Admin Tools:**
  - Create/Edit tasks with auto-repeat and auto-approve options.
  - Manage shop items and point-to-euro exchange rates.
  - Track activity history and approve pending requests.

---

## 📂 Project Structure

src/
├── assets/ # MP3 files and global images
├── components/
│ ├── Admin/ # AdminPanel, FamilySettings, ShopSettings
│ ├── Auth/ # RegisterPage, ProfileSelector
│ ├── Kids/ # TaskList, Shop, Achievements
│ └── Layout/ # Header, Navbar, Footer
├── firebase.ts # Firebase initialization & configuration
├── translations.ts # Multi-language support (FI, RU, EN)
└── App.tsx # Global state, Auth observer, and core logic

---

## 📂 Database Schema (Firestore)

- **users**: `{ uid, name, role, avatar (URL), familyId, currentBalance, totalPoints }`
- **tasks_list**: `{ label, points, icon, assignedTo, isAutoRepeat, isAutoApprove }`
- **approvals**: `{ userId, taskId, label, points, status ('pending'|'in_progress') }`
- **achievements_list**: `{ label, threshold, icon, type, valueInEuro }`
- **history**: Log of all completed earning and spending events.

---

## 🚀 Installation & Setup

1. **Install Dependencies:**
   npm install

2. **Configure Firebase:**
   Copy `.env.example` to `.env.local` and fill in real values:
   VITE_FIREBASE_API_KEY=your_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_USE_FIREBASE_FUNCTIONS=true

3. **Run Development Mode:**
   npm run dev

4. **Backfill legacy Firestore data (optional but recommended before strict tenant rollout):**
   - Dry run: `npm run migrate:familyid:dry`
   - Apply: `npm run migrate:familyid:apply`
   - Detailed rollout notes: `docs/family-rollout-and-migration.md`

## ⚙️ GitHub / Firebase Setup

- Add `FIREBASE_SERVICE_ACCOUNT_JSON` to GitHub Secrets for Firebase auth.
- Set `FIREBASE_PROJECT_ID` as a repository variable in GitHub.
- Add these repository variables too for deploy builds: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, and optionally `VITE_FIREBASE_MEASUREMENT_ID`.
- `Verify` in GitHub uses safe placeholder Vite env values, so real frontend Firebase keys are not required just for CI build checks.
- The deploy workflow is manual only; it does not run on every `push` to `main`.
- Use the `deploy_functions` input only when Cloud Functions should be deployed too.
- Points, approvals, shop purchases, family-member edits, and achievement activation require deployed Firebase Functions; keep `VITE_USE_FIREBASE_FUNCTIONS=true` in local and production builds.
- For local Functions work, install their dependencies once in `functions/` with `npm install`.

---

_Developed as a modern tool for family productivity and positive reinforcement._
