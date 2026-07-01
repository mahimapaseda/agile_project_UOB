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
  peekInventoryCache,
  invalidateInventoryCache,
  setCachedInventory,
} from '../client-data-cache';
import { db } from '../firebase';
import type { InventoryItem } from '@/types';
import { sanitizeFirestoreWrite, toInventory } from './shared';

async function fetchInventoryFromFirestore(
  typeFilter?: string,
  statusFilter?: string,
): Promise<InventoryItem[]> {
  if (typeFilter && statusFilter) {
    const snap = await getDocs(
      query(
        collection(db, 'inventory'),
        where('assetType', '==', typeFilter),
        where('assetStatus', '==', statusFilter),
        orderBy('assetName'),
      ),
    );
    return snap.docs.map(toInventory);
  }
  if (typeFilter) {
    const snap = await getDocs(
      query(collection(db, 'inventory'), where('assetType', '==', typeFilter), orderBy('assetName')),
    );
    return snap.docs.map(toInventory);
  }
  if (statusFilter) {
    const snap = await getDocs(
      query(
        collection(db, 'inventory'),
        where('assetStatus', '==', statusFilter),
        orderBy('assetName'),
      ),
    );
    return snap.docs.map(toInventory);
  }
  const snap = await getDocs(query(collection(db, 'inventory'), orderBy('assetName')));
  return snap.docs.map(toInventory);
}

export async function getInventoryList(
  typeFilter?: string,
  statusFilter?: string,
): Promise<InventoryItem[]> {
  const cached = peekInventoryCache<InventoryItem>(typeFilter, statusFilter);
  if (cached?.fresh) return cached.data;
  if (cached && !cached.fresh) {
    void fetchInventoryFromFirestore(typeFilter, statusFilter).then((items) => {
      setCachedInventory(items, typeFilter, statusFilter);
    });
    return cached.data;
  }

  const items = await fetchInventoryFromFirestore(typeFilter, statusFilter);
  setCachedInventory(items, typeFilter, statusFilter);
  return items;
}

export async function getInventoryItem(id: string): Promise<InventoryItem | null> {
  const snap = await getDoc(doc(db, 'inventory', id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as InventoryItem) : null;
}

export async function addInventoryItem(
  data: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  const ref = await addDoc(collection(db, 'inventory'), {
    ...sanitizeFirestoreWrite(data as Record<string, unknown>),
    quantity: data.quantity ?? 1,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  invalidateInventoryCache({ assetType: data.assetType });
  return ref.id;
}

export async function updateInventoryItem(id: string, data: Partial<InventoryItem>): Promise<void> {
  await updateDoc(doc(db, 'inventory', id), {
    ...sanitizeFirestoreWrite(data as Record<string, unknown>),
    updatedAt: serverTimestamp(),
  });
  invalidateInventoryCache(data.assetType ? { assetType: data.assetType } : undefined);
}

export async function deleteInventoryItem(id: string): Promise<void> {
  await deleteDoc(doc(db, 'inventory', id));
  invalidateInventoryCache();
}

export async function searchInventory(term: string): Promise<InventoryItem[]> {
  const lower = term.toLowerCase();
  const pool = await getInventoryList();
  return pool.filter(
    (item) =>
      item.assetName.toLowerCase().includes(lower) ||
      (item.assetType?.toLowerCase().includes(lower) ?? false) ||
      (item.location?.toLowerCase().includes(lower) ?? false) ||
      (item.serialNo?.toLowerCase().includes(lower) ?? false) ||
      (item.model?.toLowerCase().includes(lower) ?? false) ||
      (item.bookName?.toLowerCase().includes(lower) ?? false) ||
      (item.receivedFrom?.toLowerCase().includes(lower) ?? false),
  );
}
