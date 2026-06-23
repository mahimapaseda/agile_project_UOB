function isVercelHost(): boolean {
  return (
    typeof window !== 'undefined' &&
    (window.location.hostname.endsWith('.vercel.app') ||
      !window.location.hostname.includes('localhost'))
  );
}

export function isQuickPinPepperNotConfiguredMessage(message: string): boolean {
  return message.includes('QUICK_PIN_PEPPER');
}

/** User-facing hint when Quick PIN cannot be saved (missing server secret). */
export function formatQuickPinPepperConfigError(): string {
  if (isVercelHost()) {
    return (
      'Quick PIN could not be enabled: QUICK_PIN_PEPPER is not set on this server. ' +
      'In Vercel → Project → Settings → Environment Variables, add QUICK_PIN_PEPPER ' +
      '(a long random secret, 32+ characters), then redeploy. Email/password login still works.'
    );
  }

  return (
    'Quick PIN could not be enabled: QUICK_PIN_PEPPER is not set. ' +
    'Add QUICK_PIN_PEPPER to .env.local and restart npm run dev. Email/password login still works.'
  );
}

/** Shown after a successful create/update when PIN setup was skipped. */
export function quickPinSkippedNotice(): string {
  return `${formatQuickPinPepperConfigError()} You can enable Quick PIN later from User Management.`;
}

/** User-facing hint when server routes cannot load Firebase Admin credentials. */
export function formatFirebaseAdminConfigError(serverMessage?: string): string {
  const base =
    serverMessage?.trim() ||
    'Firebase Admin is not configured on this server.';

  if (isVercelHost()) {
    return `${base} In Vercel → Project → Settings → Environment Variables, add FIREBASE_SERVICE_ACCOUNT_JSON (full service-account JSON on one line) or FIREBASE_SERVICE_ACCOUNT_JSON_BASE64, then redeploy.`;
  }

  return `${base} Locally, add FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_SERVICE_ACCOUNT_JSON to .env.local and restart npm run dev.`;
}

export function isFirebaseAdminNotConfiguredMessage(message: string): boolean {
  if (isQuickPinPepperNotConfiguredMessage(message)) return false;
  return message.includes('not configured') || message.includes('503');
}
