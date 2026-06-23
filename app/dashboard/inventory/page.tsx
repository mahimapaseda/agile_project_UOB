'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { PageMain } from '@/components/layout/PageMain';
import {
  InventoryDirectory,
  type InventoryViewMode,
} from '@/components/inventory/InventoryDirectory';
import { AccessGate } from '@/components/auth/AccessGate';
import { useAuth } from '@/lib/auth-context';
import { canManageInventory, canViewInventory } from '@/lib/access-control';
import { deleteInventoryItem } from '@/lib/firestore';
import { getInventoryForProfile } from '@/lib/inventory-for-profile';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { formatFirestoreError } from '@/lib/firestore-errors';
import { DataLoadError } from '@/components/ui/DataLoadError';
import { InventoryItem } from '@/types';

const FILTER_ALL = 'all';

function filterItems(
  data: InventoryItem[],
  search: string,
  typeFilter: string,
  statusFilter: string,
): InventoryItem[] {
  let out = data;
  const q = search.trim().toLowerCase();
  if (q) {
    out = out.filter(
      (item) =>
        item.assetName.toLowerCase().includes(q) ||
        (item.assetType?.toLowerCase().includes(q) ?? false) ||
        (item.location?.toLowerCase().includes(q) ?? false) ||
        (item.serialNo?.toLowerCase().includes(q) ?? false) ||
        (item.model?.toLowerCase().includes(q) ?? false) ||
        (item.bookName?.toLowerCase().includes(q) ?? false) ||
        (item.receivedFrom?.toLowerCase().includes(q) ?? false),
    );
  }
  if (typeFilter !== FILTER_ALL) out = out.filter((item) => item.assetType === typeFilter);
  if (statusFilter !== FILTER_ALL) out = out.filter((item) => item.assetStatus === statusFilter);
  return out;
}

function InventoryPageContent() {
  const [allItems, setAllItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [typeFilter, setTypeFilter] = useState(FILTER_ALL);
  const [statusFilter, setStatusFilter] = useState(FILTER_ALL);
  const [csvImportOpen, setCsvImportOpen] = useState(false);
  const [viewMode, setViewMode] = useState<InventoryViewMode>('list');
  const { userProfile } = useAuth();
  const canManage = canManageInventory(userProfile);

  const fetchAll = useCallback(async () => {
    if (!userProfile) return;
    setLoading(true);
    setLoadError(null);
    try {
      const data = await getInventoryForProfile(userProfile);
      setAllItems(data);
    } catch (err) {
      setLoadError(formatFirestoreError(err));
      setAllItems([]);
    } finally {
      setLoading(false);
    }
  }, [userProfile]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const items = useMemo(
    () => filterItems(allItems, debouncedSearch, typeFilter, statusFilter),
    [allItems, debouncedSearch, typeFilter, statusFilter],
  );

  const handleDelete = async (id: string) => {
    await deleteInventoryItem(id);
    setAllItems((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Header
        title="Inventory"
        subtitle={
          loading
            ? 'Loading register…'
            : `${allItems.length} asset${allItems.length !== 1 ? 's' : ''} on record`
        }
      />
      <PageMain flexContent className="flex flex-col">
        {loadError && <DataLoadError message={loadError} onRetry={() => void fetchAll()} />}
        <InventoryDirectory
          items={items}
          allItems={allItems}
          loading={loading}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          canManage={canManage}
          search={search}
          onSearchChange={setSearch}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          onDelete={handleDelete}
          csvImportOpen={csvImportOpen}
          onCsvImportOpenChange={setCsvImportOpen}
          onImported={() => void fetchAll()}
        />
      </PageMain>
    </div>
  );
}

export default function InventoryPage() {
  return (
    <AccessGate allow={canViewInventory}>
      <InventoryPageContent />
    </AccessGate>
  );
}
