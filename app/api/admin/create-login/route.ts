import { NextResponse } from 'next/server';
import { AccountType, StaffRole } from '@/types';
import { createLoginAccount } from '@/lib/admin-create-login-server';
import {
  handleRouteError,
  isApiErrorResponse,
  verifyAdminRequest,
} from '@/lib/api-route-utils';

export const runtime = 'nodejs';

const ACCOUNT_TYPES: AccountType[] = ['staff', 'student', 'parent'];

export async function POST(request: Request) {
  try {
    const admin = await verifyAdminRequest(request, {
      forbiddenMessage: 'Only principal or technical officer can create logins.',
    });
    if (isApiErrorResponse(admin)) return admin;

    const body = (await request.json()) as {
      email?: string;
      password?: string;
      displayName?: string;
      accountType?: AccountType;
      staffRole?: StaffRole;
      linkedId?: string;
      phone?: string;
      enableQuickPin?: boolean;
      quickPin?: string;
    };

    if (!body.accountType || !ACCOUNT_TYPES.includes(body.accountType)) {
      return NextResponse.json({ error: 'Invalid account type.' }, { status: 400 });
    }

    const result = await createLoginAccount({
      email: body.email || '',
      password: body.password || '',
      displayName: body.displayName || '',
      accountType: body.accountType,
      staffRole: body.staffRole,
      linkedId: body.linkedId,
      phone: body.phone,
      enableQuickPin: body.enableQuickPin,
      quickPin: body.quickPin,
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    return handleRouteError(err, 'create-login');
  }
}
