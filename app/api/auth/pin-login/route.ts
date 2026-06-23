import { NextResponse } from 'next/server';
import { AccountType } from '@/types';
import { verifyQuickPinLogin } from '@/lib/pin-auth-server';
import { handleRouteError } from '@/lib/api-route-utils';

export const runtime = 'nodejs';

const ACCOUNT_TYPES: AccountType[] = ['staff', 'student', 'parent'];

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      linkedId?: string;
      pin?: string;
      accountType?: AccountType;
    };

    const linkedId = body.linkedId?.trim();
    const pin = body.pin?.trim();
    const accountType = body.accountType;

    if (!linkedId || !pin) {
      return NextResponse.json({ error: 'ID and PIN are required.' }, { status: 400 });
    }
    if (!accountType || !ACCOUNT_TYPES.includes(accountType)) {
      return NextResponse.json({ error: 'Select account type.' }, { status: 400 });
    }

    const { customToken } = await verifyQuickPinLogin({ linkedId, pin, accountType });
    return NextResponse.json({ customToken });
  } catch (err: unknown) {
    return handleRouteError(err, 'pin-login');
  }
}
