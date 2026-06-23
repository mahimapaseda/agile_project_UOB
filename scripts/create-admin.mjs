/**
 * Creates a single principal (admin) login — Firebase Auth + staff_users.
 * Run: npm run create-admin
 *
 * Optional .env.local:
 *   ADMIN_EMAIL=principal@deltagemunupura.lk
 *   ADMIN_PASSWORD=YourSecurePassword
 *   ADMIN_DISPLAY_NAME=Principal Name
 */

import { readFileSync, existsSync } from 'fs';
import { randomBytes } from 'crypto';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function loadEnvLocal() {
  const envPath = join(root, '.env.local');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvLocal();

const serviceAccountPath =
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
  join(root, 'delta-gemunupura-dbms-firebase-adminsdk-fbsvc-6a36b477a0.json');

if (!existsSync(serviceAccountPath)) {
  console.error('\n❌ Service account not found:', serviceAccountPath);
  console.error('   Set FIREBASE_SERVICE_ACCOUNT_PATH in .env.local\n');
  process.exit(1);
}

if (!getApps().length) {
  initializeApp({ credential: cert(JSON.parse(readFileSync(serviceAccountPath, 'utf8'))) });
}

const auth = getAuth();
const db = getFirestore();

const email = (process.env.ADMIN_EMAIL || 'principal@deltagemunupura.lk').trim().toLowerCase();
const displayName = (process.env.ADMIN_DISPLAY_NAME || 'Principal Administrator').trim();
let password = process.env.ADMIN_PASSWORD?.trim();
const generatedPassword = !password;

if (!password) {
  password = randomBytes(9).toString('base64url').slice(0, 12);
}

async function main() {
  console.log('\n🔐 Creating principal admin account...\n');

  let uid;
  let created = false;

  try {
    const existing = await auth.getUserByEmail(email);
    uid = existing.uid;
    await auth.updateUser(uid, { displayName, password, emailVerified: true });
    console.log(`   ↻ Firebase Auth user already existed — password updated`);
  } catch (e) {
    if (e.code !== 'auth/user-not-found') throw e;
    const user = await auth.createUser({
      email,
      password,
      displayName,
      emailVerified: true,
    });
    uid = user.uid;
    created = true;
    console.log(`   ✓ Firebase Auth user created`);
  }

  await db
    .collection('staff_users')
    .doc(uid)
    .set(
      {
        email,
        displayName,
        staffRole: 'principal',
        linkedId: null,
        phone: null,
        photoURL: null,
        isActive: true,
        quickPinEnabled: false,
        updatedAt: FieldValue.serverTimestamp(),
        ...(created ? { createdAt: FieldValue.serverTimestamp() } : {}),
      },
      { merge: true },
    );

  console.log(`   ✓ Firestore staff_users/${uid}`);
  console.log('\n✅ Admin account ready.\n');
  console.log('   Email:    ', email);
  if (generatedPassword) {
    console.log('   Password: ', password, '(generated — save it now; set ADMIN_PASSWORD in .env.local to fix)');
  } else {
    console.log('   Password: ', '(from ADMIN_PASSWORD in .env.local)');
  }
  console.log('\n   Sign in at /login → User Management to add more accounts.\n');
}

main().catch((err) => {
  console.error('\n❌ Failed:', err.message || err);
  process.exit(1);
});
