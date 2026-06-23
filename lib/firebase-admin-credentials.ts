export const NOT_CONFIGURED = 'Firebase Admin not configured';

export type FirebaseAdminCredentialSource =
  | 'json'
  | 'json_base64'
  | 'split_env'
  | 'local_file'
  | null;

export interface FirebaseAdminCredentialStatus {
  configured: boolean;
  source: FirebaseAdminCredentialSource;
  onVercel: boolean;
  hasJson: boolean;
  hasJsonBase64: boolean;
  hasSplitEnv: boolean;
  hasLocalPath: boolean;
  projectId: string | null;
}

export function getFirebaseAdminCredentialStatus(): FirebaseAdminCredentialStatus {
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.trim();
  const projectId =
    process.env.FIREBASE_PROJECT_ID?.trim() ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() ||
    null;

  const hasJson = Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim());
  const hasJsonBase64 = Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON_BASE64?.trim());
  const hasSplitEnv = Boolean(clientEmail && privateKey && projectId);
  const hasLocalPath = Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim());

  let source: FirebaseAdminCredentialSource = null;
  if (hasJsonBase64) source = 'json_base64';
  else if (hasJson) source = 'json';
  else if (hasSplitEnv) source = 'split_env';
  else if (!process.env.VERCEL && process.env.NODE_ENV !== 'production' && hasLocalPath) {
    source = 'local_file';
  }

  return {
    configured: source !== null,
    source,
    onVercel: Boolean(process.env.VERCEL),
    hasJson,
    hasJsonBase64,
    hasSplitEnv,
    hasLocalPath,
    projectId,
  };
}

/** Normalize values pasted into Vercel (quotes, BOM, accidental wrapping). */
export function normalizeServiceAccountJsonInput(raw: string): string {
  let s = raw.trim().replace(/^\uFEFF/, '');
  if (
    (s.startsWith("'") && s.endsWith("'")) ||
    (s.startsWith('"') && s.endsWith('"') && s.length > 2 && s[1] === '{')
  ) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

export function parseServiceAccountJson(raw: string): Record<string, unknown> {
  const trimmed = normalizeServiceAccountJsonInput(raw);
  if (!trimmed) {
    throw new Error(`${NOT_CONFIGURED}. Service account JSON is empty.`);
  }

  const attempts = [trimmed];
  if (trimmed.includes('\\n') && trimmed.includes('BEGIN PRIVATE KEY')) {
    attempts.push(trimmed.replace(/\\n/g, '\n'));
  }

  for (const candidate of attempts) {
    try {
      const parsed = JSON.parse(candidate) as Record<string, unknown>;
      if (parsed && typeof parsed === 'object') return parsed;
    } catch {
      /* try next */
    }
  }

  throw new Error(
    `${NOT_CONFIGURED}. FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON — use npm run prepare-vercel-env and paste from .vercel-FIREBASE_SERVICE_ACCOUNT_JSON_BASE64.txt, or set FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY.`,
  );
}

export function loadServiceAccountFromSplitEnv(): Record<string, unknown> | null {
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.trim();
  const projectId =
    process.env.FIREBASE_PROJECT_ID?.trim() ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  if (!clientEmail || !privateKey || !projectId) return null;

  const normalizedKey = privateKey.includes('\\n')
    ? privateKey.replace(/\\n/g, '\n')
    : privateKey;

  return {
    type: 'service_account',
    project_id: projectId,
    client_email: clientEmail,
    private_key: normalizedKey,
    client_id: process.env.FIREBASE_CLIENT_ID?.trim() || undefined,
  };
}

export function loadServiceAccountFromEnv(): Record<string, unknown> {
  const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_JSON_BASE64?.trim();
  if (base64) {
    const decoded = Buffer.from(base64, 'base64').toString('utf8');
    return parseServiceAccountJson(decoded);
  }

  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (json) {
    return parseServiceAccountJson(json);
  }

  const split = loadServiceAccountFromSplitEnv();
  if (split) return split;

  const status = getFirebaseAdminCredentialStatus();
  const isVercel = status.onVercel;
  const isProduction = process.env.NODE_ENV === 'production';

  if (isVercel || isProduction) {
    const hints: string[] = [];
    if (!status.hasJson && !status.hasJsonBase64 && !status.hasSplitEnv) {
      hints.push('no FIREBASE_SERVICE_ACCOUNT_JSON / _BASE64 / split env vars detected');
    } else if (status.hasJson) {
      hints.push('FIREBASE_SERVICE_ACCOUNT_JSON is set but invalid — re-paste from npm run prepare-vercel-env');
    }
    throw new Error(
      `${NOT_CONFIGURED}. On Vercel (${hints.join('; ') || 'check env scope is Production'}), set credentials and Redeploy.`,
    );
  }

  throw new Error(`${NOT_CONFIGURED}. Set FIREBASE_SERVICE_ACCOUNT_PATH in .env.local for local dev.`);
}
