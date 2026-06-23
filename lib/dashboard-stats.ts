import {
  getDashboardStats,
  getExaminationCount,
  getStudentsInGrades,
  getStudentByAdmissionNumber,
} from './firestore';
import {
  getLinkedAdmissionNumber,
  isAdmin,
  isParentAccount,
  isStudentAccount,
  isTeacher,
  resolveTeacherAllowedGrades,
} from './access-control';
import {
  peekDashboardStatsCache,
  setDashboardStatsCache,
} from './client-data-cache';
import type { DashboardStats, Staff, UserProfile } from '@/types';

const EMPTY_LOGINS: DashboardStats['loginAccounts'] = {
  staffLogins: 0,
  studentLogins: 0,
  parentLogins: 0,
  totalLogins: 0,
};

function statsCacheKey(profile: UserProfile, linkedStaff?: Staff | null): string {
  const parts = [profile.uid, profile.accountType, profile.staffRole ?? profile.role];
  if (isTeacher(profile)) {
    parts.push(...resolveTeacherAllowedGrades(profile, linkedStaff ?? null));
  }
  if (isAdmin(profile)) parts.push('admin-logins');
  return parts.join(':');
}

async function fetchDashboardStatsForProfile(
  profile: UserProfile,
  linkedStaff?: Staff | null,
): Promise<DashboardStats> {
  if (isParentAccount(profile) || isStudentAccount(profile)) {
    const admissionNumber = getLinkedAdmissionNumber(profile);
    const student = admissionNumber
      ? await getStudentByAdmissionNumber(admissionNumber)
      : null;
    const count = student ? 1 : 0;
    const examCount = await getExaminationCount();
    return {
      totalStudents: count,
      activeStudents: student?.status === 'active' ? 1 : 0,
      totalStaff: 0,
      activeStaff: 0,
      academicStaff: 0,
      nonAcademicStaff: 0,
      totalExaminations: examCount,
      loginAccounts: EMPTY_LOGINS,
    };
  }

  if (isTeacher(profile)) {
    const grades = resolveTeacherAllowedGrades(profile, linkedStaff ?? null);
    const [myStudents, examCount] = await Promise.all([
      grades.length ? getStudentsInGrades(grades, 'active') : Promise.resolve([]),
      getExaminationCount(),
    ]);
    return {
      totalStudents: myStudents.length,
      activeStudents: myStudents.length,
      totalStaff: 0,
      activeStaff: 0,
      academicStaff: 0,
      nonAcademicStaff: 0,
      totalExaminations: examCount,
      loginAccounts: EMPTY_LOGINS,
    };
  }

  return getDashboardStats({ includeLoginCounts: isAdmin(profile) });
}

/**
 * Role-aware dashboard stats with session cache and stale-while-revalidate.
 */
export async function getDashboardStatsForProfile(
  profile: UserProfile,
  linkedStaff?: Staff | null,
): Promise<DashboardStats> {
  const key = statsCacheKey(profile, linkedStaff);
  const cached = peekDashboardStatsCache<DashboardStats>(key);
  if (cached?.fresh) return cached.data;
  if (cached && !cached.fresh) {
    void fetchDashboardStatsForProfile(profile, linkedStaff).then((data) => {
      setDashboardStatsCache(key, data);
    });
    return cached.data;
  }

  const data = await fetchDashboardStatsForProfile(profile, linkedStaff);
  setDashboardStatsCache(key, data);
  return data;
}
