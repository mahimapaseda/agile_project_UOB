/**
 * Writes gitignored files for pasting into Vercel (never commit these outputs).
 * Usage: node scripts/prepare-vercel-admin-env.mjs [path-to-service-account.json]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomBytes } from 'crypto';

const root = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(root, '..');
const defaultKey = path.join(
  projectRoot,
  'delta-gemunupura-dbms-firebase-adminsdk-fbsvc-6a36b477a0.json',
);

const keyPath = path.resolve(projectRoot, process.argv[2] || defaultKey);

if (!fs.existsSync(keyPath)) {
  console.error(`Service account file not found: ${keyPath}`);
  process.exit(1);
}

const raw = fs.readFileSync(keyPath, 'utf8');
const parsed = JSON.parse(raw);
const oneLine = JSON.stringify(parsed);
const base64 = Buffer.from(raw, 'utf8').toString('base64');

const outDir = projectRoot;
const jsonOut = path.join(outDir, '.vercel-FIREBASE_SERVICE_ACCOUNT_JSON.txt');
const b64Out = path.join(outDir, '.vercel-FIREBASE_SERVICE_ACCOUNT_JSON_BASE64.txt');

fs.writeFileSync(jsonOut, oneLine, 'utf8');
fs.writeFileSync(b64Out, base64, 'utf8');

const emailOut = path.join(outDir, '.vercel-FIREBASE_CLIENT_EMAIL.txt');
const keyOut = path.join(outDir, '.vercel-FIREBASE_PRIVATE_KEY.txt');
const pepperOut = path.join(outDir, '.vercel-QUICK_PIN_PEPPER.txt');
const quickPinPepper = randomBytes(32).toString('hex');
fs.writeFileSync(emailOut, String(parsed.client_email), 'utf8');
fs.writeFileSync(
  keyOut,
  String(parsed.private_key).replace(/\r?\n/g, '\\n'),
  'utf8',
);
fs.writeFileSync(pepperOut, quickPinPepper, 'utf8');

const readme = path.join(outDir, '.vercel-ENV-SETUP.txt');
fs.writeFileSync(
  readme,
  [
    'Vercel → Project → Settings → Environment Variables',
    'Enable for Production AND Preview, then Redeploy.',
    '',
    'RECOMMENDED (one variable):',
    `  FIREBASE_SERVICE_ACCOUNT_JSON_BASE64 = contents of ${path.basename(b64Out)}`,
    '',
    'Alternative:',
    `  FIREBASE_SERVICE_ACCOUNT_JSON = contents of ${path.basename(jsonOut)}`,
    '',
    'Or three variables:',
    `  FIREBASE_CLIENT_EMAIL = contents of ${path.basename(emailOut)}`,
    `  FIREBASE_PRIVATE_KEY  = contents of ${path.basename(keyOut)}`,
    '  NEXT_PUBLIC_FIREBASE_PROJECT_ID = already set for client',
    '',
    'Quick PIN (required for PIN login on production):',
    `  QUICK_PIN_PEPPER = contents of ${path.basename(pepperOut)}`,
    '  (Keep this secret. Do not change after users have PINs unless resetting all PINs.)',
    '',
    'Verify after redeploy:',
    '  https://YOUR-APP.vercel.app/api/health/firebase-admin',
    '',
    `Project: ${parsed.project_id}`,
    `Client:  ${parsed.client_email}`,
  ].join('\n'),
  'utf8',
);

console.log('Created (gitignored):');
console.log(`  ${path.basename(b64Out)}  → FIREBASE_SERVICE_ACCOUNT_JSON_BASE64 (recommended)`);
console.log(`  ${path.basename(jsonOut)} → FIREBASE_SERVICE_ACCOUNT_JSON`);
console.log(`  ${path.basename(emailOut)} + ${path.basename(keyOut)} → split env vars`);
console.log(`  ${path.basename(pepperOut)} → QUICK_PIN_PEPPER`);
console.log(`  ${path.basename(readme)} → step-by-step`);
console.log('Then: npm run push-vercel-env   OR paste manually and Redeploy.');
