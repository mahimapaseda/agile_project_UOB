/** User-facing messages for client-side Firestore failures. */

function errorCode(err: unknown): string | undefined {
  if (err && typeof err === 'object' && 'code' in err) {
    return String((err as { code: string }).code);
  }
  return undefined;
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

export function isFirestorePermissionError(err: unknown): boolean {
  const code = errorCode(err);
  return code === 'permission-denied' || errorMessage(err).includes('Missing or insufficient permissions');
}

export function isFirestoreNetworkError(err: unknown): boolean {
  const code = errorCode(err);
  const msg = errorMessage(err).toLowerCase();
  return code === 'unavailable' || msg.includes('network') || msg.includes('failed to fetch');
}

export function isFirestoreIndexError(err: unknown): boolean {
  const code = errorCode(err);
  const msg = errorMessage(err).toLowerCase();
  return code === 'failed-precondition' && msg.includes('index');
}

export function formatFirestoreError(err: unknown): string {
  if (isFirestorePermissionError(err)) {
    return 'You do not have permission to view this data. Contact your administrator if this is unexpected.';
  }
  if (isFirestoreIndexError(err)) {
    return 'A database index is still building. Wait a few minutes, then click Try again.';
  }
  if (isFirestoreNetworkError(err)) {
    return 'Network error. Check your connection and try again.';
  }
  return 'Could not load data. Please try again.';
}
