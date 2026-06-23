import {
  collection,
  doc,
  getDocs,
  getDoc,
  getCountFromServer,
  addDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import {
  peekExaminationsCache,
  invalidateDashboardStatsCache,
  invalidateExaminationsCache,
  setCachedExaminations,
} from '../client-data-cache';
import { db } from '../firebase';
import type { Examination, ExamResult } from '@/types';
import { sanitizeFirestoreWrite, toExam, toResult } from './shared';

async function fetchExaminationsFromFirestore(): Promise<Examination[]> {
  const snap = await getDocs(query(collection(db, 'examinations'), orderBy('createdAt', 'desc')));
  return snap.docs.map(toExam);
}

export async function getExaminations(): Promise<Examination[]> {
  const cached = peekExaminationsCache<Examination>();
  if (cached?.fresh) return cached.data;
  if (cached && !cached.fresh) {
    void fetchExaminationsFromFirestore().then((exams) => setCachedExaminations(exams));
    return cached.data;
  }

  const exams = await fetchExaminationsFromFirestore();
  setCachedExaminations(exams);
  return exams;
}

export async function getExaminationCount(): Promise<number> {
  const cached = peekExaminationsCache<Examination>();
  if (cached) return cached.data.length;
  const snap = await getCountFromServer(collection(db, 'examinations'));
  return snap.data().count;
}

export async function getExamination(id: string): Promise<Examination | null> {
  const snap = await getDoc(doc(db, 'examinations', id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Examination) : null;
}

export async function addExamination(
  data: Omit<Examination, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  const ref = await addDoc(collection(db, 'examinations'), {
    ...sanitizeFirestoreWrite(data as Record<string, unknown>),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  invalidateExaminationsCache();
  invalidateDashboardStatsCache();
  return ref.id;
}

export async function updateExamination(id: string, data: Partial<Examination>): Promise<void> {
  await updateDoc(doc(db, 'examinations', id), {
    ...sanitizeFirestoreWrite(data as Record<string, unknown>),
    updatedAt: serverTimestamp(),
  });
  invalidateExaminationsCache();
  invalidateDashboardStatsCache();
}

export async function deleteExamination(id: string): Promise<void> {
  const resultsSnap = await getDocs(
    query(collection(db, 'results'), where('examinationId', '==', id)),
  );
  const BATCH_SIZE = 500;
  for (let i = 0; i < resultsSnap.docs.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    for (const resultDoc of resultsSnap.docs.slice(i, i + BATCH_SIZE)) {
      batch.delete(resultDoc.ref);
    }
    await batch.commit();
  }
  await deleteDoc(doc(db, 'examinations', id));
  invalidateExaminationsCache();
  invalidateDashboardStatsCache();
}

function sortResultsByStudentName(results: ExamResult[]): ExamResult[] {
  return [...results].sort((a, b) => a.studentName.localeCompare(b.studentName));
}

function sortResultsByCreatedAtDesc(results: ExamResult[]): ExamResult[] {
  return [...results].sort((a, b) => {
    const ta = a.createdAt?.toDate?.()?.getTime() ?? 0;
    const tb = b.createdAt?.toDate?.()?.getTime() ?? 0;
    return tb - ta;
  });
}

export async function getResults(examinationId: string): Promise<ExamResult[]> {
  const snap = await getDocs(
    query(collection(db, 'results'), where('examinationId', '==', examinationId)),
  );
  return sortResultsByStudentName(snap.docs.map(toResult));
}

export async function getStudentResults(
  studentId: string,
  admissionNumber?: string,
): Promise<ExamResult[]> {
  const adm = admissionNumber?.trim();
  if (adm) {
    const snap = await getDocs(query(collection(db, 'results'), where('admissionNumber', '==', adm)));
    return sortResultsByCreatedAtDesc(snap.docs.map(toResult));
  }
  const snap = await getDocs(query(collection(db, 'results'), where('studentId', '==', studentId)));
  return sortResultsByCreatedAtDesc(snap.docs.map(toResult));
}

export async function getResult(id: string): Promise<ExamResult | null> {
  const snap = await getDoc(doc(db, 'results', id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as ExamResult) : null;
}

export async function addResult(data: Omit<ExamResult, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const dupSnap = await getDocs(
    query(
      collection(db, 'results'),
      where('examinationId', '==', data.examinationId),
      where('studentId', '==', data.studentId),
      limit(1),
    ),
  );
  if (!dupSnap.empty) {
    const existingId = dupSnap.docs[0].id;
    await updateResult(existingId, data);
    return existingId;
  }
  const ref = await addDoc(collection(db, 'results'), {
    ...sanitizeFirestoreWrite(data as Record<string, unknown>),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function syncExamResultsMetadata(
  examinationId: string,
  patch: Pick<ExamResult, 'grade' | 'examName' | 'year' | 'term'>,
): Promise<void> {
  const snap = await getDocs(
    query(collection(db, 'results'), where('examinationId', '==', examinationId)),
  );
  if (snap.empty) return;

  const sanitized = sanitizeFirestoreWrite(patch as Record<string, unknown>);
  const BATCH_SIZE = 500;
  for (let i = 0; i < snap.docs.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    for (const resultDoc of snap.docs.slice(i, i + BATCH_SIZE)) {
      batch.update(resultDoc.ref, { ...sanitized, updatedAt: serverTimestamp() });
    }
    await batch.commit();
  }
}

export async function updateResult(id: string, data: Partial<ExamResult>): Promise<void> {
  await updateDoc(doc(db, 'results', id), {
    ...sanitizeFirestoreWrite(data as Record<string, unknown>),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteResult(id: string): Promise<void> {
  await deleteDoc(doc(db, 'results', id));
}
