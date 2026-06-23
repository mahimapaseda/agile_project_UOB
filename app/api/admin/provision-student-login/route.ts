import { NextResponse } from 'next/server';
import { provisionStudentLogin } from '@/lib/provision-student-login-server';
import {
  handleRouteError,
  isApiErrorResponse,
  verifyAdminRequest,
} from '@/lib/api-route-utils';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const admin = await verifyAdminRequest(request, {
      forbiddenMessage: 'Only principal or technical officer can provision student logins.',
    });
    if (isApiErrorResponse(admin)) return admin;

    const body = (await request.json()) as {
      admissionNumber?: string;
      resetExisting?: boolean;
    };

    if (!body.admissionNumber?.trim()) {
      return NextResponse.json({ error: 'Admission number is required.' }, { status: 400 });
    }

    const result = await provisionStudentLogin(body.admissionNumber.trim(), {
      resetExisting: body.resetExisting === true,
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    return handleRouteError(err, 'provision-student-login');
  }
}
