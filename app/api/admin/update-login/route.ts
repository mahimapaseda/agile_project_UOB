import { NextResponse } from 'next/server';
import { StaffRole } from '@/types';
import { updateLoginAccount } from '@/lib/admin-update-login-server';
import {
  handleRouteError,
  isApiErrorResponse,
  verifyAdminRequest,
} from '@/lib/api-route-utils';

export const runtime = 'nodejs';

export async function PATCH(request: Request) {
  try {
    const admin = await verifyAdminRequest(request, {
      forbiddenMessage: 'Only principal or technical officer can update logins.',
    });
    if (isApiErrorResponse(admin)) return admin;

    const body = (await request.json()) as {
      uid?: string;
      email?: string;
      password?: string;
      displayName?: string;
      phone?: string;
      staffRole?: StaffRole;
      enableQuickPin?: boolean;
      quickPin?: string;
    };

    if (!body.uid?.trim()) {
      return NextResponse.json({ error: 'User ID is required.' }, { status: 400 });
    }

    const result = await updateLoginAccount({
      uid: body.uid,
      email: body.email,
      password: body.password,
      displayName: body.displayName,
      phone: body.phone,
      staffRole: body.staffRole,
      enableQuickPin: body.enableQuickPin,
      quickPin: body.quickPin,
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    return handleRouteError(err, 'update-login');
  }
}
