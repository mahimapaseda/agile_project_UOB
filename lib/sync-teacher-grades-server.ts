import { getAdminDb } from './firebase-admin-server';
import { parseGradesTaught } from './grades-taught';

/** Copy `staff.gradesTaught` → `staff_users.allowedStudentGrades` for the signed-in teacher. */
export async function syncTeacherGradesForUid(uid: string): Promise<string[]> {
  const db = getAdminDb();
  const userRef = db.collection('staff_users').doc(uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists) {
    throw new Error('Staff login profile not found.');
  }

  const data = userSnap.data()!;
  if (data.staffRole !== 'teacher') {
    return (data.allowedStudentGrades as string[] | undefined) ?? [];
  }

  const linkedId = typeof data.linkedId === 'string' ? data.linkedId.trim() : '';
  if (!linkedId) {
    await userRef.set({ allowedStudentGrades: [] }, { merge: true });
    return [];
  }

  const staffSnap = await db.collection('staff').where('staffId', '==', linkedId).limit(1).get();
  const grades = staffSnap.empty
    ? []
    : parseGradesTaught(staffSnap.docs[0]!.data().gradesTaught as string | undefined);

  await userRef.set({ allowedStudentGrades: grades }, { merge: true });
  return grades;
}
