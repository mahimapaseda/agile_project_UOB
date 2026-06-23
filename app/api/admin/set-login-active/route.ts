import { NextResponse } from 'next/server';
import { setLoginActiveWithProfile } from '@/lib/admin-set-login-active-server';
import {
  handleRouteError,
  isApiErrorResponse,
  verifyAdminRequest,
} from '@/lib/api-route-utils';

export const runtime = 'nodejs';

export async function PATCH(request: Request) {
  try {
    const admin = await verifyAdminRequest(request, {
      forbiddenMessage: 'Only principal or technical officer can change login status.',
    });
    if (isApiErrorResponse(admin)) return admin;

    const body = (await request.json()) as { uid?: string; isActive?: boolean };
    const uid = body.uid?.trim();
    if (!uid) {
      return NextResponse.json({ error: 'User ID is required.' }, { status: 400 });
    }
    if (typeof body.isActive !== 'boolean') {
      return NextResponse.json({ error: 'isActive must be true or false.' }, { status: 400 });
    }

    const result = await setLoginActiveWithProfile(uid, body.isActive);
    return NextResponse.json(result);
  } catch (err: unknown) {
    return handleRouteError(err, 'set-login-active');
  }
}
