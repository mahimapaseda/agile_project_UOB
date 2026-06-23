import { NextResponse } from 'next/server';
import { provisionStudentLoginsBulk } from '@/lib/provision-student-login-server';
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
      admissionNumbers?: string[];
      onlyWithoutLogin?: boolean;
    };

    const results = await provisionStudentLoginsBulk({
      admissionNumbers: body.admissionNumbers,
      onlyWithoutLogin: body.onlyWithoutLogin !== false,
    });

    return NextResponse.json({ results });
  } catch (err: unknown) {
    return handleRouteError(err, 'provision-student-logins');
  }
}
