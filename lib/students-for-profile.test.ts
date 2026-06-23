import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Staff, UserProfile } from '@/types';

vi.mock('./firestore', () => ({
  getStudents: vi.fn(),
  getStudentsInGrades: vi.fn(),
  searchStudents: vi.fn(),
}));

import { getStudents, getStudentsInGrades, searchStudents } from './firestore';
import { getStudentsForProfile, searchStudentsForProfile } from './students-for-profile';

const principal: UserProfile = {
  uid: 'p1',
  email: 'p@test.lk',
  displayName: 'Principal',
  role: 'principal',
  accountType: 'staff',
  staffRole: 'principal',
};

const teacher: UserProfile = {
  uid: 't1',
  email: 't@test.lk',
  displayName: 'Teacher',
  role: 'teacher',
  accountType: 'staff',
  staffRole: 'teacher',
  allowedStudentGrades: ['Grade 6', 'Grade 7'],
};

const linkedStaff: Staff = {
  id: 's1',
  staffId: 'STF001',
  name: 'Teacher',
  designation: 'Teacher',
  staffType: 'academic',
  status: 'active',
  gradesTaught: 'Grade 8',
} as Staff;

beforeEach(() => {
  vi.mocked(getStudents).mockReset();
  vi.mocked(getStudentsInGrades).mockReset();
  vi.mocked(searchStudents).mockReset();
});

describe('students-for-profile', () => {
  it('loads all students for principal', async () => {
    vi.mocked(getStudents).mockResolvedValue([]);
    await getStudentsForProfile(principal, 'Grade 6', 'active');
    expect(getStudents).toHaveBeenCalledWith('Grade 6', 'active');
    expect(getStudentsInGrades).not.toHaveBeenCalled();
  });

  it('restricts teachers to allowed grades', async () => {
    vi.mocked(getStudentsInGrades).mockResolvedValue([]);
    await getStudentsForProfile(teacher);
    expect(getStudentsInGrades).toHaveBeenCalledWith(['Grade 6', 'Grade 7'], undefined);

    await getStudentsForProfile(teacher, 'Grade 10');
    expect(getStudentsInGrades).not.toHaveBeenCalledWith(['Grade 10'], undefined);
  });

  it('uses linked staff grades when profile has none', async () => {
    const bareTeacher = { ...teacher, allowedStudentGrades: undefined };
    vi.mocked(getStudentsInGrades).mockResolvedValue([]);
    await getStudentsForProfile(bareTeacher, undefined, undefined, { linkedStaff });
    expect(getStudentsInGrades).toHaveBeenCalledWith(['Grade 8'], undefined);
  });

  it('scopes teacher search to allowed grades', async () => {
    vi.mocked(searchStudents).mockResolvedValue([]);
    await searchStudentsForProfile(teacher, 'kumar');
    expect(searchStudents).toHaveBeenCalledWith('kumar', ['Grade 6', 'Grade 7']);
  });
});
