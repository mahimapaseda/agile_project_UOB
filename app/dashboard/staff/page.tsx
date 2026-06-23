'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Header } from '@/components/layout/Header';
import { PageMain } from '@/components/layout/PageMain';
import { StaffDirectory } from '@/components/staff/StaffDirectory';
import { deleteStaff, updateStaff } from '@/lib/firestore';
import { getStaffForProfile } from '@/lib/staff-for-profile';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { formatFirestoreError } from '@/lib/firestore-errors';
import { DataLoadError } from '@/components/ui/DataLoadError';
import { Staff } from '@/types';
import { useAuth } from '@/lib/auth-context';
import { AccessGate } from '@/components/auth/AccessGate';
import { canManageStaff, canViewFullStaffProfile, canViewStaffDirectory } from '@/lib/access-control';

const FILTER_ALL = 'all';

function filterStaff(
  data: Staff[],
  search: string,
  typeFilter: string,
  statusFilter: string,
): Staff[] {
  let out = data;
  const q = search.trim().toLowerCase();
  if (q) {
    out = out.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.staffId.toLowerCase().includes(q) ||
        s.designation.toLowerCase().includes(q) ||
        (s.registrationNumber?.toLowerCase().includes(q) ?? false) ||
        (s.classAndGrade?.toLowerCase().includes(q) ?? false) ||
        (s.email?.toLowerCase().includes(q) ?? false) ||
        (s.teacherNumber?.toLowerCase().includes(q) ?? false),
    );
  }
  if (typeFilter !== FILTER_ALL) out = out.filter((s) => s.staffType === typeFilter);
  if (statusFilter !== FILTER_ALL) out = out.filter((s) => s.status === statusFilter);
  return out;
}

function StaffPageContent() {
  const [allStaff, setAllStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [typeFilter, setTypeFilter] = useState(FILTER_ALL);
  const [statusFilter, setStatusFilter] = useState(FILTER_ALL);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [csvImportOpen, setCsvImportOpen] = useState(false);
  const { userProfile } = useAuth();
  const canManage = canManageStaff(userProfile);
  const fullProfile = canViewFullStaffProfile(userProfile);

  const fetchAll = useCallback(async () => {
    if (!userProfile) return;
    setLoading(true);
    setLoadError(null);
    try {
      const data = await getStaffForProfile(userProfile);
      setAllStaff(data);
    } catch (err) {
      setLoadError(formatFirestoreError(err));
      setAllStaff([]);
    } finally {
      setLoading(false);
    }
  }, [userProfile]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const staff = useMemo(
    () => filterStaff(allStaff, debouncedSearch, typeFilter, statusFilter),
    [allStaff, debouncedSearch, typeFilter, statusFilter],
  );

  const handleDelete = async (id: string) => {
    await deleteStaff(id);
    setAllStaff((prev) => prev.filter((s) => s.id !== id));
  };

  const handleStatusChange = async (id: string, status: Staff['status']) => {
    await updateStaff(id, { status });
    setAllStaff((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Header
        title="Staff"
        subtitle={
          loading
            ? 'Loading directory…'
            : fullProfile
              ? `${staff.length} staff member${staff.length !== 1 ? 's' : ''}`
              : `${staff.length} contact${staff.length !== 1 ? 's' : ''} · limited view`
        }
      />
      <PageMain flexContent className="flex flex-col">
        {loadError && <DataLoadError message={loadError} onRetry={() => void fetchAll()} />}
        <StaffDirectory
          staff={staff}
          loading={loading}
          search={search}
          onSearchChange={setSearch}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          canManage={canManage}
          limitedView={!fullProfile}
          onStatusChange={canManage ? handleStatusChange : undefined}
          onDelete={handleDelete}
          csvImportOpen={csvImportOpen}
          onCsvImportOpenChange={setCsvImportOpen}
          onImported={() => void fetchAll()}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
      </PageMain>
    </div>
  );
}

export default function StaffPage() {
  return (
    <AccessGate allow={canViewStaffDirectory}>
      <StaffPageContent />
    </AccessGate>
  );
}
