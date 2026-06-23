import { NextResponse } from 'next/server';
import { AccountType } from '@/types';
import { isStaffAdminUid, setQuickPinForUser } from '@/lib/pin-auth-server';
import {
  apiJsonError,
  handleRouteError,
  isApiErrorResponse,
  verifyBearerUid,
} from '@/lib/api-route-utils';

export const runtime = 'nodejs';

const ACCOUNT_TYPES: AccountType[] = ['staff', 'student', 'parent'];

export async function POST(request: Request) {
  try {
    const callerUid = await verifyBearerUid(request);
    if (isApiErrorResponse(callerUid)) return callerUid;

    const body = (await request.json()) as {
      uid?: string;
      linkedId?: string;
      accountType?: AccountType;
      pin?: string;
    };

    const uid = body.uid?.trim();
    const linkedId = body.linkedId?.trim();
    const pin = body.pin?.trim();
    const accountType = body.accountType;

    if (!uid || !linkedId || !pin) {
      return NextResponse.json({ error: 'uid, linkedId, and pin are required.' }, { status: 400 });
    }
    if (!accountType || !ACCOUNT_TYPES.includes(accountType)) {
      return NextResponse.json({ error: 'Invalid account type.' }, { status: 400 });
    }

    const isSelf = callerUid === uid;
    const isAdmin = !isSelf ? await isStaffAdminUid(callerUid) : false;
    if (!isSelf && !isAdmin) {
      return apiJsonError('Forbidden.', 403);
    }

    await setQuickPinForUser({
      uid,
      linkedId,
      accountType,
      pin,
      skipLinkedIdCheck: isAdmin && !isSelf,
    });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return handleRouteError(err, 'set-quick-pin');
  }
}
