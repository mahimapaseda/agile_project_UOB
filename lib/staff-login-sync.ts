import { collection, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { db } from './firebase';
import { parseGradesTaught } from './grades-taught';
import { STAFF_USERS_COLLECTION } from './user-profiles';
import type { Staff } from '@/types';

/** Copy parsed grades onto every `staff_users` doc linked to this employment record. */
export async function syncAllowedStudentGradesForStaff(
  staff: Pick<Staff, 'staffId' | 'gradesTaught'>,
): Promise<void> {
  const staffId = staff.staffId?.trim();
  if (!staffId) return;

  const allowedStudentGrades = parseGradesTaught(staff.gradesTaught);
  const snap = await getDocs(
    query(collection(db, STAFF_USERS_COLLECTION), where('linkedId', '==', staffId)),
  );

  await Promise.all(
    snap.docs.map((d) =>
      updateDoc(d.ref, { allowedStudentGrades }),
    ),
  );
}
