/**
 * Moves documents from legacy `users` → staff_users | student_users | parents
 */

import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
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
  join(root, 'delta-gemunupura-dbms-firebase-adminsdk-fbsvc-619db44a47.json');

if (!existsSync(serviceAccountPath)) {
  console.error('❌ Service account not found:', serviceAccountPath);
  process.exit(1);
}

if (!getApps().length) {
  initializeApp({ credential: cert(JSON.parse(readFileSync(serviceAccountPath, 'utf8'))) });
}

const db = getFirestore();

function roleToStaffRole(role) {
  if (role === 'principal') return 'principal';
  if (role === 'technical_officer') return 'technical_officer';
  if (role === 'vice_principal') return 'vice_principal';
  return 'teacher';
}

function targetCollection(role) {
  if (role === 'student') return 'student_users';
  if (role === 'parent') return 'parents';
  return 'staff_users';
}

async function main() {
  const snap = await db.collection('users').get();
  if (snap.empty) {
    console.log('\n✓ No documents in `users` collection. Nothing to migrate.\n');
    return;
  }

  console.log(`\n↻ Migrating ${snap.size} document(s) from users → new collections...\n`);

  for (const doc of snap.docs) {
    const uid = doc.id;
    const data = doc.data();
    const role = data.role;

    if (!role) {
      console.log(`   ⚠ Skip ${uid} — missing role`);
      continue;
    }

    const collection = targetCollection(role);
    const payload = {
      email: data.email,
      displayName: data.displayName,
      phone: data.phone || null,
      linkedId: data.linkedId || null,
      photoURL: data.photoURL || null,
      isActive: data.isActive !== false,
      createdAt: data.createdAt || FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (collection === 'staff_users') {
      payload.staffRole = data.staffRole || roleToStaffRole(role);
    }

    await db.collection(collection).doc(uid).set(payload, { merge: true });
    await doc.ref.delete();
    console.log(`   ✓ ${data.email} → ${collection}${collection === 'staff_users' ? ` (${payload.staffRole})` : ''}`);
  }

  console.log('\n✅ Migration complete. The `users` collection should now be empty.\n');
}

main().catch((err) => {
  console.error('❌', err.message || err);
  process.exit(1);
});
