import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { createRequire } from 'module';
import {
  loadServiceAccountFromEnv,
  NOT_CONFIGURED,
  parseServiceAccountJson,
} from './firebase-admin-credentials';

let app: App | null = null;
let envLoaded = false;

const nodeRequire = createRequire(import.meta.url);

/** Dev only: Next.js API routes may not always inherit .env.local — load it explicitly. */
function loadEnvLocal(): void {
  if (envLoaded) return;
  envLoaded = true;
  const fs = nodeRequire('fs') as typeof import('fs');
  const path = nodeRequire('path') as typeof import('path');
  const envPath = path.join(/* turbopackIgnore: true */ process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

function resolveServiceAccountPath(): string {
  loadEnvLocal();
  const path = nodeRequire('path') as typeof import('path');
  const fromEnv = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (fromEnv) {
    return path.isAbsolute(fromEnv)
      ? fromEnv
      : path.resolve(/* turbopackIgnore: true */ process.cwd(), fromEnv);
  }
  return path.join(
    /* turbopackIgnore: true */ process.cwd(),
    'delta-gemunupura-dbms-firebase-adminsdk-fbsvc-6a36b477a0.json',
  );
}

function loadServiceAccount(): Record<string, unknown> {
  try {
    return loadServiceAccountFromEnv();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!message.includes(NOT_CONFIGURED)) throw err;

    const isVercel = Boolean(process.env.VERCEL);
    const isProduction = process.env.NODE_ENV === 'production';
    if (isVercel || isProduction) throw err;

    const fs = nodeRequire('fs') as typeof import('fs');
    const filePath = resolveServiceAccountPath();
    if (!fs.existsSync(filePath)) throw err;
    return parseServiceAccountJson(fs.readFileSync(filePath, 'utf8'));
  }
}

export function getAdminApp(): App {
  if (app) return app;
  if (!getApps().length) {
    app = initializeApp({ credential: cert(loadServiceAccount()) });
  } else {
    app = getApps()[0]!;
  }
  return app;
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}

export function getAdminDb(): Firestore {
  return getFirestore(getAdminApp());
}
