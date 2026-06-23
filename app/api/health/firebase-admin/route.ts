import { NextResponse } from 'next/server';
import {
  getFirebaseAdminCredentialStatus,
  NOT_CONFIGURED,
} from '@/lib/firebase-admin-credentials';
import { getAdminAuth } from '@/lib/firebase-admin-server';

export const runtime = 'nodejs';

/** Deployment check — no secrets returned. */
export async function GET() {
  const status = getFirebaseAdminCredentialStatus();

  try {
    getAdminAuth();
    return NextResponse.json({
      ok: true,
      ...status,
      message: 'Firebase Admin initialized successfully.',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to initialize Firebase Admin.';
    const setupHint = status.onVercel
      ? 'Set FIREBASE_SERVICE_ACCOUNT_JSON_BASE64 on Vercel (Production + Preview), then Redeploy. Run npm run prepare-vercel-env locally for the value.'
      : 'Set FIREBASE_SERVICE_ACCOUNT_PATH in .env.local or add the JSON env vars.';
    return NextResponse.json(
      {
        ok: false,
        ...status,
        message: message.includes(NOT_CONFIGURED)
          ? `${message} ${setupHint}`
          : `Invalid credentials: ${message}`,
      },
      { status: 503 },
    );
  }
}
