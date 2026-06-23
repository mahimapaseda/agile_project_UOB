/**
 * Deletes ALL school DBMS data from Firestore and Firebase Authentication.
 * WARNING: This cannot be undone.
 *
 * Run: npm run clear-data
 */

import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const COLLECTIONS = [
  'staff_users',
  'student_users',
  'parents',
  'users',
  'students',
  'staff',
  'examinations',
  'results',
  'inventory',
  'pin_credentials',
];

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
  join(root, 'delta-gemunupura-dbms-firebase-adminsdk-fbsvc-619db44a47.json');

if (!existsSync(serviceAccountPath)) {
  console.error('❌ Service account not found:', serviceAccountPath);
  process.exit(1);
}

if (!getApps().length) {
  initializeApp({ credential: cert(JSON.parse(readFileSync(serviceAccountPath, 'utf8'))) });
}

const db = getFirestore();
const auth = getAuth();

async function deleteCollection(name) {
  const col = db.collection(name);
  let total = 0;

  while (true) {
    const snap = await col.limit(400).get();
    if (snap.empty) break;

    const batch = db.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    total += snap.size;
  }

  return total;
}

async function deleteAllAuthUsers() {
  let total = 0;
  let pageToken;

  do {
    const result = await auth.listUsers(1000, pageToken);
    if (result.users.length === 0) break;

    await auth.deleteUsers(result.users.map((u) => u.uid));
    total += result.users.length;
    pageToken = result.pageToken;
  } while (pageToken);

  return total;
}

async function main() {
  console.log('\n⚠️  Clearing ALL Delta Gemunupura DBMS data...\n');

  for (const name of COLLECTIONS) {
    const count = await deleteCollection(name);
    console.log(`   Firestore /${name}: deleted ${count} document(s)`);
  }

  const authCount = await deleteAllAuthUsers();
  console.log(`   Firebase Auth: deleted ${authCount} user(s)`);

  console.log('\n✅ All data removed. Create a principal login in Firebase Console (see README).\n');
}

main().catch((err) => {
  console.error('\n❌ Clear failed:', err.message || err);
  process.exit(1);
});
