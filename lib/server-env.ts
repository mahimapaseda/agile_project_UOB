/** Server startup checks for required environment variables. */

const CLIENT_FIREBASE_KEYS = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
] as const;

function hasFirebaseAdminCredentials(): boolean {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim()) return true;
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON_BASE64?.trim()) return true;
  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim()) return true;
  if (process.env.FIREBASE_CLIENT_EMAIL?.trim() && process.env.FIREBASE_PRIVATE_KEY?.trim()) {
    return true;
  }
  return false;
}

export function validateServerEnv(): void {
  const missingClient = CLIENT_FIREBASE_KEYS.filter((key) => !process.env[key]?.trim());
  if (missingClient.length > 0) {
    console.warn(`[env] Missing Firebase client variables: ${missingClient.join(', ')}`);
  }

  if (process.env.NODE_ENV !== 'production') return;

  if (!process.env.QUICK_PIN_PEPPER?.trim()) {
    console.error('[env] QUICK_PIN_PEPPER is required in production for Quick PIN login.');
  }

  if (!hasFirebaseAdminCredentials()) {
    console.error(
      '[env] Firebase Admin credentials are missing. Admin API routes and Quick PIN will not work.',
    );
  }
}
