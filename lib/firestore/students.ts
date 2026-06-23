import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import {
  peekStudentsCache,
  invalidateDashboardStatsCache,
  invalidateStudentsCache,
  setCachedStudents,
} from '../client-data-cache';
import { db } from '../firebase';
import type { Student } from '@/types';
import { sanitizeFirestoreWrite, toStudent } from './shared';

async function fetchStudentsFromFirestore(
  gradeFilter?: string,
  statusFilter?: string,
): Promise<Student[]> {
  try {
    if (gradeFilter && statusFilter) {
      const snap = await getDocs(
        query(
          collection(db, 'students'),
          where('grade', '==', gradeFilter),
          where('status', '==', statusFilter),
          orderBy('name'),
        ),
      );
      return snap.docs.map(toStudent);
    }
    if (gradeFilter) {
      const snap = await getDocs(
        query(collection(db, 'students'), where('grade', '==', gradeFilter), orderBy('name')),
      );
      return snap.docs.map(toStudent);
    }
    if (statusFilter) {
      const snap = await getDocs(
        query(collection(db, 'students'), where('status', '==', statusFilter), orderBy('name')),
      );
      return snap.docs.map(toStudent);
    }
    const snap = await getDocs(query(collection(db, 'students'), orderBy('name')));
    return snap.docs.map(toStudent);
  } catch {
    if (gradeFilter) {
      const snap = await getDocs(
        query(collection(db, 'students'), where('grade', '==', gradeFilter)),
      );
      let students = snap.docs.map(toStudent);
      if (statusFilter) students = students.filter((s) => s.status === statusFilter);
      students.sort((a, b) => a.name.localeCompare(b.name));
      return students;
    }
    const snap = await getDocs(query(collection(db, 'students'), orderBy('name')));
    let students = snap.docs.map(toStudent);
    if (statusFilter) students = students.filter((s) => s.status === statusFilter);
    return students;
  }
}

export async function getStudents(gradeFilter?: string, statusFilter?: string): Promise<Student[]> {
  const cached = peekStudentsCache<Student>(gradeFilter, statusFilter);
  if (cached?.fresh) return cached.data;
  if (cached && !cached.fresh) {
    void fetchStudentsFromFirestore(gradeFilter, statusFilter).then((students) => {
      setCachedStudents(students, gradeFilter, statusFilter);
    });
    return cached.data;
  }

  const students = await fetchStudentsFromFirestore(gradeFilter, statusFilter);
  setCachedStudents(students, gradeFilter, statusFilter);
  return students;
}

export async function getStudent(id: string): Promise<Student | null> {
  const snap = await getDoc(doc(db, 'students', id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Student) : null;
}

export async function getStudentByAdmissionNumber(admissionNumber: string): Promise<Student | null> {
  const snap = await getDocs(
    query(collection(db, 'students'), where('admissionNumber', '==', admissionNumber)),
  );
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as Student;
}

export async function addStudent(data: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const ref = await addDoc(collection(db, 'students'), {
    ...sanitizeFirestoreWrite(data as Record<string, unknown>),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  invalidateStudentsCache({ grade: data.grade });
  invalidateDashboardStatsCache();
  return ref.id;
}

export async function updateStudent(id: string, data: Partial<Student>): Promise<void> {
  await updateDoc(doc(db, 'students', id), {
    ...sanitizeFirestoreWrite(data as Record<string, unknown>),
    updatedAt: serverTimestamp(),
  });
  invalidateStudentsCache(data.grade ? { grade: data.grade } : undefined);
  invalidateDashboardStatsCache();
}

export async function deleteStudent(id: string): Promise<void> {
  await deleteDoc(doc(db, 'students', id));
  invalidateStudentsCache();
  invalidateDashboardStatsCache();
}

/** Students in any of the given grades (for teacher dashboards / directory). */
export async function getStudentsInGrades(
  grades: string[],
  statusFilter?: string,
): Promise<Student[]> {
  if (!grades.length) return [];
  const unique = [...new Set(grades)];
  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += 10) {
    chunks.push(unique.slice(i, i + 10));
  }
  const byId = new Map<string, Student>();
  for (const chunk of chunks) {
    const snap = await getDocs(query(collection(db, 'students'), where('grade', 'in', chunk)));
    for (const d of snap.docs) {
      const student = toStudent(d);
      if (!statusFilter || student.status === statusFilter) {
        byId.set(student.id, student);
      }
    }
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** @param scopeGrades When set (teachers), only search within these grades — required for security rules. */
export async function searchStudents(term: string, scopeGrades?: string[]): Promise<Student[]> {
  const lower = term.toLowerCase();
  const pool = scopeGrades?.length ? await getStudentsInGrades(scopeGrades) : await getStudents();
  return pool.filter(
    (s) =>
      s.name.toLowerCase().includes(lower) ||
      s.admissionNumber.toLowerCase().includes(lower) ||
      s.grade.toLowerCase().includes(lower),
  );
}
