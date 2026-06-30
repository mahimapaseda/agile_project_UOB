import type { DocumentData, DocumentSnapshot, QueryDocumentSnapshot } from 'firebase/firestore';
import type { ClassTimetable, Examination, ExamResult, InventoryItem, Staff, Student } from '@/types';

/** Firestore throws if any field value is `undefined`. Empty strings become `null` to clear optional fields. */
export function sanitizeFirestoreWrite(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || key === 'id' || key === 'createdAt' || key === 'updatedAt') continue;
    out[key] = value === '' ? null : value;
  }
  return out;
}

export const toStudent = (d: QueryDocumentSnapshot<DocumentData>): Student =>
  ({ id: d.id, ...d.data() } as Student);

export const toStaff = (d: QueryDocumentSnapshot<DocumentData>): Staff =>
  ({ id: d.id, ...d.data() } as Staff);

export const toExam = (d: QueryDocumentSnapshot<DocumentData>): Examination =>
  ({ id: d.id, ...d.data() } as Examination);

export const toResult = (d: QueryDocumentSnapshot<DocumentData>): ExamResult =>
  ({ id: d.id, ...d.data() } as ExamResult);

export const toInventory = (d: QueryDocumentSnapshot<DocumentData>): InventoryItem =>
  ({ id: d.id, ...d.data() } as InventoryItem);

export const toTimetable = (d: QueryDocumentSnapshot<DocumentData> | DocumentSnapshot<DocumentData>): ClassTimetable =>
  ({ id: d.id, ...d.data() } as ClassTimetable);
