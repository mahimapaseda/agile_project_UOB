# Delta Gemunupura College — DBMS

School Database Management System built with Next.js 16, Firebase, and Tailwind CSS.

## Features (Phase 1)

| Module | Functions |
|--------|-----------|
| **Student Management** | Add / Edit / Delete / Search students, Export PDF profiles and list |
| **Staff Management** | Academic & Non-Academic staff CRUD, Google Form CSV/XLSX import, Subject assignment, Export PDF |
| **Examination Management** | Create exams, Add student results per subject, Auto-grade, Export report cards & class reports |
| **User Management** | Role-based access: Principal · Technical Officer · Staff · Student · Parent |
| **Inventory** | School asset register — CRUD, filters, search, staff role access |
| **Dashboard** | Role-aware live stats, quick-action cards |

> Timetable module is scaffolded and coming soon.

## Progressive Web App (PWA)

The app can be **installed** on phones and desktops (standalone window, home-screen icon).

| Feature | Detail |
|---------|--------|
| Manifest | `app/manifest.ts` → `/manifest.webmanifest` |
| Icons | `public/icons/` (regenerate: `npm run generate-pwa-icons`) |
| Service worker | `public/sw.js` — caches static assets; **does not** cache Firebase/API |
| Offline | `/offline` when navigation fails without network |

**Install:** Chrome/Edge → address bar **Install**, or use the in-app hint. **iPhone/iPad:** Safari → Share → **Add to Home Screen** — full guide at **`/install-ios`**. **Android:** official APK at **`/install-android`** ([docs/ANDROID-INSTALL.md](./docs/ANDROID-INSTALL.md)).

**Note:** Login and live school data still require internet; the PWA improves access and performance, not full offline DB use.

**Android Play Protect “unsafe / older Android”:** Do **not** use Chrome “Install app”. Use the official APK: **[/install-android](https://dgmvdbms.vercel.app/install-android)** — see [docs/ANDROID-INSTALL.md](./docs/ANDROID-INSTALL.md). IT runs GitHub Action **Build Android APK** once.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: Firebase Firestore
- **Auth**: Firebase Authentication
- **Styling**: Tailwind CSS v4 + Radix UI primitives
- **Forms**: React Hook Form + Zod v4
- **PDF**: jsPDF
- **Deployment**: Vercel

## Roles & Permissions

| Permission | Principal | Tech. Officer | Staff | Student | Parent |
|-----------|-----------|---------------|-------|---------|--------|
| View Students | ✓ | ✓ | ✓ | ✓ | ✓ |
| Manage Students | ✓ | ✓ | ✓ | ✗ | ✗ |
| View Staff | ✓ | ✓ | ✓ | ✗ | ✗ |
| Manage Staff | ✓ | ✓ | ✗ | ✗ | ✗ |
| Manage Exams & Results | ✓ | ✓ | ✓ | ✗ | ✗ |
| User Management | ✓ | ✓ | ✗ | ✗ | ✗ |

## Setup

### 1. Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable **Authentication** → Email/Password
4. Enable **Firestore Database** (start in production mode)
5. Add Firestore security rules (see below)

### 2. Environment Variables

Copy [`.env.local.example`](./.env.local.example) to `.env.local` and fill in your Firebase config:

```bash
cp .env.local.example .env.local
```

Get values from: Firebase Console → Project Settings → General → Your apps → Web app

### 3. Firestore Security Rules (required)

Login profiles live in **`staff_users`**, **`student_users`**, and **`parents`**. The legacy **`users`** collection is blocked and must not be read from the app.

**Publish rules or you will see `Missing or insufficient permissions` on login:**

1. Open [Firebase Console](https://console.firebase.google.com) → your project → **Firestore** → **Rules**
2. Copy the full contents of [`firestore.rules`](./firestore.rules) in this repo
3. Click **Publish**

Alternatively, with Firebase CLI (after `firebase init` in this folder):

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

Composite indexes for student and inventory list queries live in [`firestore.indexes.json`](./firestore.indexes.json). Deploy indexes after pulling performance updates or filtered directories may fall back to slower client-side filtering until indexes finish building.

**Troubleshooting permissions**

| Symptom | Fix |
|--------|-----|
| Error right after login | Publish `firestore.rules`; ensure your Auth UID has a doc in `staff_users`, `student_users`, or `parents` (see step 4 below) |
| Staff cannot open dashboard stats | Sign in with a staff account that has a matching `staff_users` Firestore document, not only Firebase Auth |
| Parent/student sees permission error on Students list | Expected if the app lists all students — use **My Child** / **My Profile** instead |

### 4. Create First Admin User

With a service account in `.env.local` (`FIREBASE_SERVICE_ACCOUNT_PATH`), run:

```bash
npm run create-admin
```

Optional in `.env.local`:

| Variable | Default |
|----------|---------|
| `ADMIN_EMAIL` | `principal@deltagemunupura.lk` |
| `ADMIN_PASSWORD` | Random (printed once) |
| `ADMIN_DISPLAY_NAME` | `Principal Administrator` |

This creates Firebase Auth + a `staff_users` document with `staffRole: principal` (full admin).

**Manual alternative:** Firebase Console → Authentication → add user, then Firestore → `staff_users` → doc ID = Auth UID with `staffRole: "principal"` and `isActive: true`.

### 5. Clear all data (optional)

To remove every login, student, staff, and exam record from Firebase (cannot be undone):

1. Firebase Console → **Project settings** → **Service accounts** → **Generate new private key**
2. Save the file and set `FIREBASE_SERVICE_ACCOUNT_PATH` in `.env.local` (see [DEPLOY.md](./DEPLOY.md) for Vercel).
3. Run:

```bash
npm run clear-data
```

After clearing, create the first principal again (step 4) and add real records through the app or CSV import.

### 6. Import staff from Google Forms

On **Dashboard → Staff**, click **Import** and upload:

- `Staff members data collection form. (Responses).csv` (Google Sheets export), or
- The same file as `.xlsx`

Download a header-only template from **Staff → Import → Download sample CSV** (`public/samples/staff-import-sample.csv`). Staff ID is taken from **Registration Number** when present; otherwise from **This school's teacher's Number** (`STF000043` style). Existing IDs are updated.

### 7. Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3001](http://localhost:3001)

### 8. Tests & CI

```bash
npm run test        # unit tests (Vitest)
npm run lint
npm run build
```

GitHub Actions workflow [`.github/workflows/ci.yml`](./.github/workflows/ci.yml) runs lint, test, and build on pull requests and pushes to `main`.

### 9. Deploy to Vercel

1. Push to GitHub
2. Import the `school-dbms` folder in Vercel
3. Add environment variables in Vercel → Settings → Environment Variables
4. Deploy

## Project Structure

```
school-dbms/
├── app/
│   ├── (dashboard)/          # Protected dashboard pages
│   │   ├── students/         # Student CRUD
│   │   ├── staff/            # Staff CRUD
│   │   ├── examinations/     # Exam + Results management
│   │   ├── admin/            # User management
│   │   ├── inventory/        # Asset register
│   │   └── timetable/        # Coming soon
│   └── login/                # Auth page
├── components/
│   ├── ui/                   # Reusable UI components
│   ├── layout/               # Sidebar + Header
│   ├── students/             # Student-specific components
│   ├── staff/                # Staff-specific components
│   ├── examinations/         # Exam-specific components
│   └── admin/                # Admin components
├── lib/
│   ├── firebase.ts           # Firebase config
│   ├── firestore/            # Firestore helpers (students, staff, exams, …)
│   ├── auth-context.tsx      # Auth state provider
│   ├── pdf-export.ts         # PDF generation
│   └── utils.ts              # Utilities
└── types/
    └── index.ts              # TypeScript types
```

