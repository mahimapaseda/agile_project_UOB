# Deploy Delta Gemunupura College DBMS

This app is a **Next.js 16** project designed for **[Vercel](https://vercel.com)** with **Firebase** (Auth + Firestore). Follow these steps in order.

---

## Prerequisites

1. **Firebase project** with Authentication (Email/Password) and Firestore enabled.
2. **Firestore rules published** — copy [`firestore.rules`](./firestore.rules) → Firebase Console → Firestore → Rules → **Publish**.
3. **At least one admin login** created in Firebase Auth + `staff_users` (see README step 4).
4. **GitHub repo** pushed: `https://github.com/mahimapaseda/delta-gemunupura-dbms-2026`

---

## 1. Firebase: authorized domains

After deploy you get a URL like `https://your-app.vercel.app`.

1. [Firebase Console](https://console.firebase.google.com) → your project → **Authentication** → **Settings** → **Authorized domains**
2. Add:
   - `your-app.vercel.app`
   - Any custom domain you attach later

Without this, sign-in fails on the live site.

---

## 2. Vercel: import project

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import **mahimapaseda/delta-gemunupura-dbms-2026** (or your fork)
3. **Root Directory**: repository root (where `package.json` lives)
4. **Framework Preset**: Next.js (auto-detected)
5. **Build Command**: `npm run build` (default)
6. **Output**: default for Next.js

Do **not** deploy until environment variables below are set.

---

## 3. Environment variables (Vercel)

In the project → **Settings** → **Environment Variables**, add these for **Production** (and Preview if you want):

### Client (required)

| Name | Where to get it |
|------|-----------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase → Project settings → Your apps → Web app |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Same (`xxx.firebaseapp.com`) |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Same |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Same |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Same |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Same |

### Server — API routes (PIN login, user admin)

Vercel cannot read a JSON file from the repo (and you must **not** commit the service account).

| Name | Value |
|------|--------|
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Open your `*-firebase-adminsdk-*.json`, copy **entire** contents, paste as **one line** (no line breaks). Apply to **Production** and **Preview**. |
| `FIREBASE_SERVICE_ACCOUNT_JSON_BASE64` | *(optional)* Same JSON file, base64-encoded (often easier than one-line JSON). Use **either** this or `FIREBASE_SERVICE_ACCOUNT_JSON`, not both. |

**Or** set these three (good when the private key is multiline):

| Name | Value |
|------|--------|
| `FIREBASE_CLIENT_EMAIL` | `client_email` from the JSON file |
| `FIREBASE_PRIVATE_KEY` | `private_key` from the JSON (paste with `\n` for line breaks, or real newlines in Vercel) |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Already required for the client |

After adding or changing server env vars, click **Redeploy** (env vars are not picked up by an already-running deployment).

Optional locally only:

| Name | Value |
|------|--------|
| `FIREBASE_SERVICE_ACCOUNT_PATH` | File path on your machine — **not used on Vercel** |

## 4. Deploy

1. Click **Deploy** (or push to `main` if Git integration is on).
2. Wait for build to finish (`npm run build` must pass).
3. Open the production URL → `/login` and sign in with your principal (or other) account.

---

## 5. Post-deploy checklist

| Step | Action |
|------|--------|
| Rules | Firestore rules published from `firestore.rules` |
| Domains | Vercel hostname added to Firebase Auth authorized domains |
| Admin | At least one `staff_users` doc + Auth user exists |
| API | Test Quick PIN / User Management if you use those features |
---

## 6. Custom domain (optional)

1. Vercel → Project → **Domains** → add your school domain
2. Add the same domain in Firebase **Authorized domains**
3. Redeploy if you change env vars

---

## 7. Deploy Firestore rules via CLI (optional)

```bash
npm install -g firebase-tools
firebase login
firebase use <your-project-id>
firebase deploy --only firestore:rules
```

Requires `firebase.json` in this repo (already present).

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Build fails on Vercel | Run `npm run build` locally; fix TypeScript errors |
| `Missing or insufficient permissions` after login | Publish `firestore.rules`; ensure user has doc in `staff_users` / `student_users` / `parents` |
| Login works locally, not on Vercel | Add Vercel URL to Firebase authorized domains; check `NEXT_PUBLIC_*` vars |
| PIN login / Create user API 500 | Set `FIREBASE_SERVICE_ACCOUNT_JSON` on Vercel |
| Wrong Turbopack/root warnings | `next.config.ts` sets `turbopack.root` to the project folder |

---

## Alternative: self-hosted (Node)

```bash
npm install
npm run build
npm run start
```

Runs on port **3000** by default (`next start`). Set the same env vars in the host environment. Use a reverse proxy (nginx) and HTTPS in production.

---

## Security reminders

- Never commit `*-firebase-adminsdk-*.json` or `.env.local` (already in `.gitignore`).
- Rotate the service account key if it was ever pushed to a public repo.
- Use strong passwords for all school accounts.
