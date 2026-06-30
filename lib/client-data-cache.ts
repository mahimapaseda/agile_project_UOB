/** In-memory cache with stale-while-revalidate for Firestore list reads. */

const TTL_MS = 90_000;
const STALE_MS = Math.floor(TTL_MS * 0.7);

type Entry<T> = { data: T; fetchedAt: number };

type CachePeek<T> =
  | { data: T; fresh: true }
  | { data: T; fresh: false; stale: true }
  | null;

function cacheKey(parts: (string | undefined)[]): string {
  return parts.map((p) => p ?? '_').join('|');
}

function peekEntry<T>(entry: Entry<T> | undefined): CachePeek<T> {
  if (!entry) return null;
  const age = Date.now() - entry.fetchedAt;
  if (age >= TTL_MS) return null;
  if (age >= STALE_MS) return { data: entry.data, fresh: false, stale: true };
  return { data: entry.data, fresh: true };
}

function setEntry<T>(map: Map<string, Entry<unknown[]>>, key: string, data: T[]): void {
  map.set(key, { data, fetchedAt: Date.now() });
}

const studentsByKey = new Map<string, Entry<unknown[]>>();
const staffByKey = new Map<string, Entry<unknown[]>>();
let examinationsCache: Entry<unknown[]> | undefined;
const inventoryByKey = new Map<string, Entry<unknown[]>>();
const dashboardStatsByKey = new Map<string, Entry<unknown>>();

// ─── Students ─────────────────────────────────────────────────────────────────

export function peekStudentsCache<T>(
  gradeFilter?: string,
  statusFilter?: string,
): CachePeek<T[]> {
  return peekEntry(studentsByKey.get(cacheKey(['students', gradeFilter, statusFilter]))) as CachePeek<T[]>;
}

export function setCachedStudents<T>(
  data: T[],
  gradeFilter?: string,
  statusFilter?: string,
): void {
  setEntry(studentsByKey, cacheKey(['students', gradeFilter, statusFilter]), data);
}

/** @deprecated Use peekStudentsCache — kept for gradual migration */
export function getCachedStudents<T>(gradeFilter?: string, statusFilter?: string): T[] | null {
  const hit = peekStudentsCache<T>(gradeFilter, statusFilter);
  return hit ? hit.data : null;
}

export function invalidateStudentsCache(scope?: { grade?: string }): void {
  if (!scope?.grade) {
    studentsByKey.clear();
    return;
  }
  const grade = scope.grade;
  for (const key of [...studentsByKey.keys()]) {
    const [, keyGrade] = key.split('|');
    if (keyGrade === '_' || keyGrade === grade) studentsByKey.delete(key);
  }
}

// ─── Staff ────────────────────────────────────────────────────────────────────

export function peekStaffCache<T>(typeFilter?: string, statusFilter?: string): CachePeek<T[]> {
  return peekEntry(staffByKey.get(cacheKey(['staff', typeFilter, statusFilter]))) as CachePeek<T[]>;
}

export function setCachedStaff<T>(data: T[], typeFilter?: string, statusFilter?: string): void {
  setEntry(staffByKey, cacheKey(['staff', typeFilter, statusFilter]), data);
}

export function getCachedStaff<T>(typeFilter?: string, statusFilter?: string): T[] | null {
  const hit = peekStaffCache<T>(typeFilter, statusFilter);
  return hit ? hit.data : null;
}

export function invalidateStaffCache(): void {
  staffByKey.clear();
}

// ─── Examinations ─────────────────────────────────────────────────────────────

export function peekExaminationsCache<T>(): CachePeek<T[]> {
  return peekEntry(examinationsCache) as CachePeek<T[]>;
}

export function setCachedExaminations<T>(data: T[]): void {
  examinationsCache = { data, fetchedAt: Date.now() };
}

export function getCachedExaminations<T>(): T[] | null {
  const hit = peekExaminationsCache<T>();
  return hit ? hit.data : null;
}

export function invalidateExaminationsCache(): void {
  examinationsCache = undefined;
}

// ─── Inventory ────────────────────────────────────────────────────────────────

export function peekInventoryCache<T>(
  typeFilter?: string,
  statusFilter?: string,
): CachePeek<T[]> {
  return peekEntry(
    inventoryByKey.get(cacheKey(['inventory', typeFilter, statusFilter])),
  ) as CachePeek<T[]>;
}

export function setCachedInventory<T>(
  data: T[],
  typeFilter?: string,
  statusFilter?: string,
): void {
  setEntry(inventoryByKey, cacheKey(['inventory', typeFilter, statusFilter]), data);
}

export function getCachedInventory<T>(typeFilter?: string, statusFilter?: string): T[] | null {
  const hit = peekInventoryCache<T>(typeFilter, statusFilter);
  return hit ? hit.data : null;
}

export function invalidateInventoryCache(scope?: { assetType?: string }): void {
  if (!scope?.assetType) {
    inventoryByKey.clear();
    return;
  }
  const assetType = scope.assetType;
  for (const key of [...inventoryByKey.keys()]) {
    const [, keyType] = key.split('|');
    if (keyType === '_' || keyType === assetType) inventoryByKey.delete(key);
  }
}

// ─── Dashboard stats ──────────────────────────────────────────────────────────

export function peekDashboardStatsCache<T>(statsKey: string): CachePeek<T> {
  return peekEntry(dashboardStatsByKey.get(statsKey)) as CachePeek<T>;
}

export function setDashboardStatsCache<T>(statsKey: string, data: T): void {
  dashboardStatsByKey.set(statsKey, { data, fetchedAt: Date.now() });
}

export function invalidateDashboardStatsCache(): void {
  dashboardStatsByKey.clear();
}

export function invalidateAllDataCaches(): void {
  invalidateStudentsCache();
  invalidateStaffCache();
  invalidateExaminationsCache();
  invalidateInventoryCache();
  invalidateDashboardStatsCache();
}
