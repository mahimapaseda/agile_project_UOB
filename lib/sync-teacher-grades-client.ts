import { auth } from './firebase';

/** Ensures `staff_users.allowedStudentGrades` matches linked staff record (for Firestore rules). */
export async function syncTeacherGradesClient(): Promise<string[] | null> {
  const user = auth.currentUser;
  if (!user) return null;

  const idToken = await user.getIdToken();
  const res = await fetch('/api/auth/sync-teacher-grades', {
    method: 'POST',
    headers: { Authorization: `Bearer ${idToken}` },
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    console.warn('Teacher grade sync failed:', body.error ?? res.statusText);
    return null;
  }

  const body = (await res.json()) as { allowedStudentGrades?: string[] };
  return body.allowedStudentGrades ?? [];
}
