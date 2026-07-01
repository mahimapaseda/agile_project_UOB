import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { ClassTimetable } from '@/types';
import { classSectionsMatch } from '../grade-class-options';
import { normalizeTimetableSchedule } from '../timetable-utils';
import { sanitizeFirestoreWrite, toTimetable } from './shared';

function sortTimetables(items: ClassTimetable[]): ClassTimetable[] {
  return [...items].sort((a, b) => {
    const grade = a.grade.localeCompare(b.grade, undefined, { numeric: true });
    if (grade !== 0) return grade;
    const year = a.academicYear - b.academicYear;
    if (year !== 0) return year;
    return a.section.localeCompare(b.section);
  });
}

/** Loads all timetables and sorts client-side (no composite index required). */
async function fetchAllTimetables(): Promise<ClassTimetable[]> {
  const snap = await getDocs(collection(db, 'timetables'));
  return sortTimetables(snap.docs.map(toTimetable));
}

export async function getTimetables(
  gradeFilter?: string,
  yearFilter?: number,
): Promise<ClassTimetable[]> {
  let items = await fetchAllTimetables();
  if (gradeFilter) items = items.filter((t) => t.grade === gradeFilter);
  if (yearFilter) items = items.filter((t) => t.academicYear === yearFilter);
  return items;
}

export async function getTimetable(id: string): Promise<ClassTimetable | null> {
  const snap = await getDoc(doc(db, 'timetables', id));
  return snap.exists() ? toTimetable(snap) : null;
}

export async function findTimetableByClass(
  grade: string,
  section: string,
  academicYear: number,
  term: string,
): Promise<ClassTimetable | null> {
  const items = await fetchAllTimetables();
  return (
    items.find(
      (t) =>
        t.grade === grade &&
        classSectionsMatch(grade, t.section, section) &&
        t.academicYear === academicYear &&
        t.term === term,
    ) ?? null
  );
}

export async function addTimetable(
  data: Omit<ClassTimetable, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  const existing = await findTimetableByClass(
    data.grade,
    data.section,
    data.academicYear,
    data.term,
  );
  if (existing) {
    throw new Error('A timetable already exists for this grade, class, year, and term.');
  }

  const ref = await addDoc(collection(db, 'timetables'), {
    ...sanitizeFirestoreWrite({
      ...data,
      schedule: normalizeTimetableSchedule(data.schedule),
    } as Record<string, unknown>),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateTimetable(id: string, data: Partial<ClassTimetable>): Promise<void> {
  const payload: Record<string, unknown> = { ...data };
  if (data.schedule) {
    payload.schedule = normalizeTimetableSchedule(data.schedule);
  }
  await updateDoc(doc(db, 'timetables', id), {
    ...sanitizeFirestoreWrite(payload),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteTimetable(id: string): Promise<void> {
  await deleteDoc(doc(db, 'timetables', id));
}

export async function searchTimetables(term: string): Promise<ClassTimetable[]> {
  const lower = term.toLowerCase();
  const pool = await fetchAllTimetables();
  return pool.filter(
    (t) =>
      t.title.toLowerCase().includes(lower) ||
      t.grade.toLowerCase().includes(lower) ||
      t.section.toLowerCase().includes(lower) ||
      t.term.toLowerCase().includes(lower) ||
      String(t.academicYear).includes(lower),
  );
}
