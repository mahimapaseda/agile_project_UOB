import { NextResponse } from 'next/server';
import { getAdminAuth } from './firebase-admin-server';
import { getStaffAdminCheck } from './pin-auth-server';

export function apiJsonError(error: string, status: number): NextResponse {
  return NextResponse.json({ error }, { status });
}

export function extractBearerToken(request: Request): string | null {
  const header = request.headers.get('authorization') || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

export type VerifiedAdmin = {
  uid: string;
  staffRole?: string;
};

export function isApiErrorResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}

/** Verify Firebase ID token and principal / technical_officer role. */
export async function verifyAdminRequest(
  request: Request,
  options?: { forbiddenMessage?: string },
): Promise<VerifiedAdmin | NextResponse> {
  const token = extractBearerToken(request);
  if (!token) {
    return apiJsonError('Unauthorized. Sign in as principal or technical officer.', 401);
  }

  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    const adminCheck = await getStaffAdminCheck(decoded.uid);
    if (!adminCheck.isAdmin) {
      return apiJsonError(
        adminCheck.reason ||
          options?.forbiddenMessage ||
          'Only principal or technical officer can perform this action.',
        403,
      );
    }
    return { uid: decoded.uid, staffRole: adminCheck.staffRole };
  } catch (err) {
    console.error('[verifyAdminRequest] token verification failed:', err);
    return apiJsonError('Invalid or expired session. Sign in again.', 401);
  }
}

/** Verify Firebase ID token and return caller UID. */
export async function verifyBearerUid(request: Request): Promise<string | NextResponse> {
  const token = extractBearerToken(request);
  if (!token) {
    return apiJsonError('Unauthorized.', 401);
  }

  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    return decoded.uid;
  } catch (err) {
    console.error('[verifyBearerUid] token verification failed:', err);
    return apiJsonError('Invalid or expired session. Sign in again.', 401);
  }
}

export function handleRouteError(err: unknown, context: string): NextResponse {
  const message = err instanceof Error ? err.message : 'Request failed.';
  console.error(`[${context}] failed:`, err);

  let status = 400;
  if (message.includes('not configured')) status = 503;
  else if (message.includes('Too many failed attempts')) status = 429;
  else if (message.includes('Unauthorized') || message.includes('Invalid or expired session')) status = 401;
  else if (
    message.includes('Forbidden') ||
    message.includes('Only principal') ||
    message.includes('Only student accounts')
  ) {
    status = 403;
  } else if (
    message.includes('Incorrect PIN') ||
    message.includes('No Quick PIN') ||
    message.includes('inactive') ||
    message.includes('Account type does not match')
  ) {
    status = 401;
  }

  return apiJsonError(message, status);
}
