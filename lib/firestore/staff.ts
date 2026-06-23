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
  type QueryConstraint,
} from 'firebase/firestore';
import {
  peekStaffCache,
  invalidateDashboardStatsCache,
  invalidateStaffCache,
  setCachedStaff,
} from '../client-data-cache';
import { db } from '../firebase';
import { syncAllowedStudentGradesForStaff } from '../staff-login-sync';
import type { Staff } from '@/types';
import { sanitizeFirestoreWrite, toStaff } from './shared';

async function fetchStaffFromFirestore(
  typeFilter?: string,
  statusFilter?: string,
): Promise<Staff[]> {
  const constraints: QueryConstraint[] = [];
  if (statusFilter) constraints.push(where('status', '==', statusFilter));
  if (typeFilter) constraints.push(where('staffType', '==', typeFilter));
  constraints.push(orderBy('name'));

  try {
    const snap = await getDocs(query(collection(db, 'staff'), ...constraints));
    return snap.docs.map(toStaff);
  } catch {
    const snap = await getDocs(query(collection(db, 'staff'), orderBy('name')));
    let staff = snap.docs.map(toStaff);
    if (typeFilter) staff = staff.filter((s) => s.staffType === typeFilter);
    if (statusFilter) staff = staff.filter((s) => s.status === statusFilter);
    return staff;
  }
}

export async function getStaffList(typeFilter?: string, statusFilter?: string): Promise<Staff[]> {
  const cached = peekStaffCache<Staff>(typeFilter, statusFilter);
  if (cached?.fresh) return cached.data;
  if (cached && !cached.fresh) {
    void fetchStaffFromFirestore(typeFilter, statusFilter).then((staff) => {
      setCachedStaff(staff, typeFilter, statusFilter);
    });
    return cached.data;
  }

  const staff = await fetchStaffFromFirestore(typeFilter, statusFilter);
  setCachedStaff(staff, typeFilter, statusFilter);
  return staff;
}

export async function getStaff(id: string): Promise<Staff | null> {
  const snap = await getDoc(doc(db, 'staff', id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Staff) : null;
}

export async function getStaffByStaffId(staffId: string): Promise<Staff | null> {
  const normalized = staffId.trim();
  if (!normalized) return null;
  const snap = await getDocs(query(collection(db, 'staff'), where('staffId', '==', normalized)));
  if (!snap.empty) {
    const d = snap.docs[0];
    return { id: d.id, ...d.data() } as Staff;
  }
  const upper = normalized.toUpperCase();
  if (upper !== normalized) {
    const snap2 = await getDocs(query(collection(db, 'staff'), where('staffId', '==', upper)));
    if (!snap2.empty) {
      const d = snap2.docs[0];
      return { id: d.id, ...d.data() } as Staff;
    }
  }
  return null;
}

export async function addStaff(data: Omit<Staff, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const ref = await addDoc(collection(db, 'staff'), {
    ...sanitizeFirestoreWrite(data as Record<string, unknown>),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  if (data.gradesTaught) {
    await syncAllowedStudentGradesForStaff({ staffId: data.staffId, gradesTaught: data.gradesTaught });
  }
  invalidateStaffCache();
  invalidateDashboardStatsCache();
  return ref.id;
}

export async function updateStaff(id: string, data: Partial<Staff>): Promise<void> {
  await updateDoc(doc(db, 'staff', id), {
    ...sanitizeFirestoreWrite(data as Record<string, unknown>),
    updatedAt: serverTimestamp(),
  });

  const snap = await getDoc(doc(db, 'staff', id));
  if (snap.exists() && (data.gradesTaught !== undefined || data.staffId !== undefined)) {
    const staff = { id: snap.id, ...snap.data() } as Staff;
    await syncAllowedStudentGradesForStaff(staff);
  }
  invalidateStaffCache();
  invalidateDashboardStatsCache();
}

export async function deleteStaff(id: string): Promise<void> {
  await deleteDoc(doc(db, 'staff', id));
  invalidateStaffCache();
  invalidateDashboardStatsCache();
}

export async function searchStaff(term: string): Promise<Staff[]> {
  const all = await getStaffList();
  const lower = term.toLowerCase();
  return all.filter(
    (s) =>
      s.name.toLowerCase().includes(lower) ||
      s.staffId.toLowerCase().includes(lower) ||
      s.designation.toLowerCase().includes(lower) ||
      (s.registrationNumber?.toLowerCase().includes(lower) ?? false) ||
      (s.classAndGrade?.toLowerCase().includes(lower) ?? false) ||
      (s.email?.toLowerCase().includes(lower) ?? false) ||
      (s.teacherNumber?.toLowerCase().includes(lower) ?? false),
  );
}
