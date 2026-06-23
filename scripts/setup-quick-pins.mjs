/**
 * Sets Quick PIN credentials for all login accounts that have linkedId + phone.
 * Default PIN = last 4 digits of phone (or 1234).
 * Run: npm run setup-pins
 */

import { readFileSync, existsSync } from 'fs';
import { createHmac } from 'crypto';
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
  console.error('\n❌ Service account file not found:', serviceAccountPath);
  process.exit(1);
}

if (!getApps().length) {
  initializeApp({ credential: cert(JSON.parse(readFileSync(serviceAccountPath, 'utf8'))) });
}

const db = getFirestore();

function pepper() {
  return (
    process.env.QUICK_PIN_PEPPER ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    'delta-gemunupura-quick-pin'
  );
}

function hashPin(pin, linkedId, accountType) {
  const id = linkedId.trim().toUpperCase();
  const digits = pin.replace(/\D/g, '');
  return createHmac('sha256', pepper()).update(`${accountType}:${id}:${digits}`).digest('hex');
}

function suggestPin(phone) {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.length >= 4) return digits.slice(-4);
  return '1234';
}

async function setupCollection(collection, accountType) {
  const snap = await db.collection(collection).get();
  let count = 0;
  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const linkedId = data.linkedId;
    if (!linkedId) continue;
    const pin = suggestPin(data.phone);
    const credId = `${accountType}_${String(linkedId).trim().toUpperCase()}`;
    await db.collection('pin_credentials').doc(credId).set(
      {
        uid: docSnap.id,
        linkedId: String(linkedId).trim().toUpperCase(),
        accountType,
        pinHash: hashPin(pin, linkedId, accountType),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    await docSnap.ref.set({ quickPinEnabled: true, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    console.log(`   ✓ ${accountType} ${linkedId} → PIN ${pin}`);
    count++;
  }
  return count;
}

async function main() {
  console.log('\n🔐 Setting up Quick PIN credentials...\n');
  const staff = await setupCollection('staff_users', 'staff');
  const students = await setupCollection('student_users', 'student');
  const parents = await setupCollection('parents', 'parent');
  console.log(`\n✅ ${staff + students + parents} Quick PIN(s) configured (default: last 4 digits of phone).\n`);
}

main().catch((err) => {
  console.error('\n❌', err.message || err);
  process.exit(1);
});
