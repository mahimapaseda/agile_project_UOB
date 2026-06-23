# Android install — fix Play Protect “unsafe / older Android”

## The problem

Chrome’s **Install app** creates a **WebAPK**. On Android 14+, Play Protect often shows:

> *This app was built for an older version of Android…*

That is **not** because your school site is dangerous. The **wrapper package** is outdated. **Manifest-only fixes cannot change WebAPK targetSdk.**

## The solution (use the official APK)

1. Open **https://dgmvdbms.vercel.app/install-android**
2. Tap **Download Delta DBMS APK**
3. Open the downloaded file → **Install**
4. If asked, allow install from your browser or Files app

This APK is a **Trusted Web Activity** built with **targetSdk 35** — the same app as the website, without the WebAPK warning.

---

## IT: Publish the APK (one-time setup)

### 1. GitHub secret

Repository → **Settings** → **Secrets and variables** → **Actions** → New secret:

| Name | Value |
|------|--------|
| `ANDROID_KEYSTORE_PASSWORD` | Strong password (save it — needed for every rebuild) |

### 2. Run the workflow

**Actions** → **Build Android APK** → **Run workflow**

On success:

- APK artifact is uploaded
- `public/downloads/dgc-dbms.apk` is committed for Vercel
- Logs print **SHA-256** for Digital Asset Links

### 3. Redeploy Vercel

Push triggers deploy; users download from `/downloads/dgc-dbms.apk` or `/install-android`.

### 4. Optional — full-screen TWA (no browser bar)

Add Vercel env var from workflow log:

`ANDROID_SHA256_FINGERPRINTS=<sha256-from-keystore>`

Verify: https://dgmvdbms.vercel.app/.well-known/assetlinks.json

---

## Regenerate Android project locally

```bash
npm run generate-android-twa
```

Sources live in `twa/` (Gradle project, targetSdk 35).

---

## Temporary workaround (not recommended)

If users already used Chrome **Install app** and see Play Protect:

1. Uninstall old **Delta DBMS**
2. Tap **Install anyway** (safe for `dgmvdbms.vercel.app`)

Prefer the **official APK** above to avoid the dialog entirely.
