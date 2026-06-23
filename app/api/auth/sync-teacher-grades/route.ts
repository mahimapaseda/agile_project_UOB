import { NextResponse } from 'next/server';
import { syncTeacherGradesForUid } from '@/lib/sync-teacher-grades-server';
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

    const allowedStudentGrades = await syncTeacherGradesForUid(uid);
    return NextResponse.json({ allowedStudentGrades });
  } catch (err: unknown) {
    return handleRouteError(err, 'sync-teacher-grades');
  }
}
