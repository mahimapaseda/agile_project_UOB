import { NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin-server';
import { clearMustChangePassword, getMustChangePassword } from '@/lib/provision-student-login-server';
import { STUDENT_USERS_COLLECTION } from '@/lib/user-profiles';
import {
  handleRouteError,
  isApiErrorResponse,
  verifyBearerUid,
} from '@/lib/api-route-utils';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const uid = await verifyBearerUid(request);
    if (isApiErrorResponse(uid)) return uid;

    const body = (await request.json()) as { newPassword?: string };
    const newPassword = body.newPassword?.trim() || '';

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
    }

    const snap = await getAdminDb().collection(STUDENT_USERS_COLLECTION).doc(uid).get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'Only student accounts can use this flow.' }, { status: 403 });
    }

    const mustChange = await getMustChangePassword(uid);
    if (!mustChange) {
      return NextResponse.json({ error: 'Password change is not required for this account.' }, { status: 400 });
    }

    await getAdminAuth().updateUser(uid, { password: newPassword });
    await clearMustChangePassword(uid);

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return handleRouteError(err, 'complete-password-setup');
  }
}
