import { NextResponse } from 'next/server';
import { migrateLegacyStudentLoginEmails } from '@/lib/provision-student-login-server';
import {
  handleRouteError,
  isApiErrorResponse,
  verifyAdminRequest,
} from '@/lib/api-route-utils';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const admin = await verifyAdminRequest(request, {
      forbiddenMessage: 'Only principal or technical officer can migrate student logins.',
    });
    if (isApiErrorResponse(admin)) return admin;

    const body = (await request.json().catch(() => ({}))) as { admissionNumbers?: string[] };
    const results = await migrateLegacyStudentLoginEmails({
      admissionNumbers: body.admissionNumbers,
    });

    const updated = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return NextResponse.json({ results, updated, failed });
  } catch (err: unknown) {
    return handleRouteError(err, 'migrate-student-login-emails');
  }
}
