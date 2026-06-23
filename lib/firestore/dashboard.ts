import { collection, getCountFromServer, query, where, type QueryConstraint } from 'firebase/firestore';
import { db } from '../firebase';
import {
  STAFF_USERS_COLLECTION,
  STUDENT_USERS_COLLECTION,
  PARENTS_COLLECTION,
} from '../user-profiles';
import type { DashboardStats } from '@/types';

async function countCollection(
  collectionId: string,
  ...constraints: QueryConstraint[]
): Promise<number> {
  const q =
    constraints.length > 0
      ? query(collection(db, collectionId), ...constraints)
      : collection(db, collectionId);
  const snap = await getCountFromServer(q);
  return snap.data().count;
}

export async function getDashboardStats(options?: {
  /** Login collections are admin-only in Firestore rules — skip for VP/clerk/teacher. */
  includeLoginCounts?: boolean;
}): Promise<DashboardStats> {
  const [
    totalStudents,
    activeStudents,
    totalStaff,
    activeStaff,
    academicStaff,
    nonAcademicStaff,
    totalExaminations,
  ] = await Promise.all([
    countCollection('students'),
    countCollection('students', where('status', '==', 'active')),
    countCollection('staff'),
    countCollection('staff', where('status', '==', 'active')),
    countCollection('staff', where('staffType', '==', 'academic')),
    countCollection('staff', where('staffType', '==', 'non-academic')),
    countCollection('examinations'),
  ]);

  let loginAccounts: DashboardStats['loginAccounts'] = {
    staffLogins: 0,
    studentLogins: 0,
    parentLogins: 0,
    totalLogins: 0,
  };

  if (options?.includeLoginCounts) {
    const [staffLogins, studentLogins, parentLogins] = await Promise.all([
      countCollection(STAFF_USERS_COLLECTION),
      countCollection(STUDENT_USERS_COLLECTION),
      countCollection(PARENTS_COLLECTION),
    ]);
    loginAccounts = {
      staffLogins,
      studentLogins,
      parentLogins,
      totalLogins: staffLogins + studentLogins + parentLogins,
    };
  }

  return {
    totalStudents,
    activeStudents,
    totalStaff,
    activeStaff,
    academicStaff,
    nonAcademicStaff,
    totalExaminations,
    loginAccounts,
  };
}
