'use client';

import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import { useWindowedList } from '@/lib/hooks/use-windowed-list';
import { LoadMoreBar } from '@/components/ui/LoadMoreBar';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  Upload,
  Eye,
  Pencil,
  Trash2,
  Package,
  MapPin,
  Hash,
  LayoutGrid,
  List,
  ChevronRight,
  Boxes,
  AlertTriangle,
  Layers,
  Filter,
  BookOpen,
  type LucideIcon,
} from 'lucide-react';
import { DirectoryPanelHeader } from '@/components/layout/DirectoryPanelHeader';
import { DirectorySkeleton } from '@/components/ui/DirectorySkeleton';
import { MobileRowActions } from '@/components/layout/MobileRowActions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
const InventoryCsvImportDialog = dynamic(
  () =>
    import('@/components/inventory/InventoryCsvImportDialog').then((m) => ({
      default: m.InventoryCsvImportDialog,
    })),
  { ssr: false },
);
import { INVENTORY_ASSET_STATUSES, INVENTORY_ASSET_TYPES, InventoryItem } from '@/types';
import { cn, formatDate } from '@/lib/utils';
import { accentBarFromGradient } from '@/lib/stat-icon-accent';
import {
  inventoryStats,
  inventoryStatusLabel,
  inventoryStatusTone,
  inventoryTypeIcon,
  INVENTORY_STATUS_STYLES,
} from '@/lib/inventory-display';

const FILTER_ALL = 'all';
export type InventoryViewMode = 'list' | 'grid';

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number | string;
  sub?: string;
  icon: LucideIcon;
  accent: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className={cn('h-1', accentBarFromGradient(accent))} />
      <div className="flex items-start justify-between gap-2 p-3.5 sm:p-4">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 sm:text-xs">
            {label}
          </p>
          <p className="mt-0.5 text-2xl font-black tabular-nums tracking-tight text-slate-900 sm:text-3xl">
            {value}
          </p>
          {sub ? <p className="mt-0.5 text-[10px] font-medium text-slate-400 sm:text-xs">{sub}</p> : null}
        </div>
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-11 sm:w-11',
            accent.includes('emerald')
              ? 'bg-emerald-50 text-emerald-700'
              : accent.includes('teal')
                ? 'bg-teal-50 text-teal-700'
                : accent.includes('amber')
                  ? 'bg-amber-50 text-amber-700'
                  : accent.includes('violet')
                    ? 'bg-violet-50 text-violet-700'
                    : 'bg-slate-100 text-slate-600',
          )}
        >
          <Icon className="h-5 w-5 sm:h-[1.35rem] sm:w-[1.35rem]" strokeWidth={2} aria-hidden />
        </div>
      </div>
    </div>
  );
}

function DeleteButton({ item, onDelete }: { item: InventoryItem; onDelete: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50 hover:text-red-700">
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this asset?</AlertDialogTitle>
          <AlertDialogDescription>
            Remove <strong>{item.assetName}</strong> from the school inventory. This cannot be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={onDelete}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function InventoryCard({
  item,
  canManage,
  onDelete,
  variant,
}: {
  item: InventoryItem;
  canManage: boolean;
  onDelete: (id: string) => void;
  variant: 'grid' | 'list';
}) {
  const Icon = inventoryTypeIcon(item.assetType);
  const tone = inventoryStatusTone(item.assetStatus);
  const styles = INVENTORY_STATUS_STYLES[tone];

  if (variant === 'grid') {
    return (
      <motion.article
        layout
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-shadow hover:shadow-md"
      >
        <div className={cn('h-1.5', accentBarFromGradient(styles.accent))} />
        <div className="flex flex-1 flex-col p-4">
          <div className="flex items-start justify-between gap-2">
            <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', styles.icon)}>
              <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
            </div>
            <Badge className={cn('border text-[10px] font-semibold', styles.badge)}>
              {inventoryStatusLabel(item.assetStatus)}
            </Badge>
          </div>
          <Link
            href={`/dashboard/inventory/${item.id}`}
            className="mt-3 line-clamp-2 text-base font-bold leading-snug text-slate-900 group-hover:text-teal-800"
          >
            {item.assetName}
          </Link>
          {item.assetType && (
            <p className="mt-1 text-xs font-medium text-slate-500">{item.assetType}</p>
          )}
          <div className="mt-3 space-y-1.5 text-xs text-slate-500">
            {item.location && (
              <p className="flex items-center gap-1.5 truncate">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                {item.location}
              </p>
            )}
            {item.serialNo && (
              <p className="flex items-center gap-1.5 truncate font-mono">
                <Hash className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                {item.serialNo}
              </p>
            )}
            {item.bookName && (
              <p className="flex items-center gap-1.5 truncate">
                <BookOpen className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                {item.bookName}
              </p>
            )}
          </div>
          <div className="mt-auto flex items-center justify-between gap-2 pt-4">
            <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">
              Qty {item.quantity}
            </span>
            <div className="flex gap-0.5">
              <Button asChild variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Link href={`/dashboard/inventory/${item.id}`}>
                  <Eye className="h-4 w-4" />
                </Link>
              </Button>
              {canManage && (
                <>
                  <Button asChild variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Link href={`/dashboard/inventory/${item.id}/edit`}>
                      <Pencil className="h-4 w-4" />
                    </Link>
                  </Button>
                  <DeleteButton item={item} onDelete={() => onDelete(item.id)} />
                </>
              )}
            </div>
          </div>
        </div>
      </motion.article>
    );
  }

  return (
    <motion.li
      layout
      initial={false}
      animate={{ opacity: 1, x: 0 }}
      className="inventory-list-row"
    >
      <div className={cn('inventory-list-accent', accentBarFromGradient(styles.accent))} aria-hidden />
      <div className="flex min-w-0 flex-1 items-center gap-3 p-3 sm:gap-4 sm:p-4">
        <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', styles.icon)}>
          <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/dashboard/inventory/${item.id}`}
              className="truncate font-bold text-slate-900 hover:text-teal-800"
            >
              {item.assetName}
            </Link>
            <Badge className={cn('border text-[10px]', styles.badge)}>
              {inventoryStatusLabel(item.assetStatus)}
            </Badge>
            {item.assetType && (
              <Badge variant="secondary" className="text-[10px]">
                {item.assetType}
              </Badge>
            )}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
            {item.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {item.location}
              </span>
            )}
            {item.serialNo && (
              <span className="inline-flex items-center gap-1 font-mono">
                <Hash className="h-3 w-3" />
                {item.serialNo}
              </span>
            )}
            {item.dateEntered && <span>Entered {formatDate(item.dateEntered)}</span>}
          </div>
        </div>
        <div className="hidden items-center gap-3 sm:flex">
          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-sm font-bold tabular-nums text-slate-800">
            ×{item.quantity}
          </span>
          <Button asChild variant="ghost" size="sm">
            <Link href={`/dashboard/inventory/${item.id}`}>
              <ChevronRight className="h-5 w-5" />
            </Link>
          </Button>
          {canManage && (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href={`/dashboard/inventory/${item.id}/edit`}>
                  <Pencil className="h-4 w-4" />
                </Link>
              </Button>
              <DeleteButton item={item} onDelete={() => onDelete(item.id)} />
            </>
          )}
        </div>
        <MobileRowActions
          actions={[
            { label: 'View', icon: <Eye className="h-4 w-4" />, href: `/dashboard/inventory/${item.id}` },
            {
              label: 'Edit',
              icon: <Pencil className="h-4 w-4" />,
              href: `/dashboard/inventory/${item.id}/edit`,
              hidden: !canManage,
            },
            {
              label: 'Delete',
              icon: <Trash2 className="h-4 w-4" />,
              destructive: true,
              hidden: !canManage,
              onClick: () => onDelete(item.id),
            },
          ]}
        />
      </div>
    </motion.li>
  );
}

interface InventoryDirectoryProps {
  items: InventoryItem[];
  allItems: InventoryItem[];
  loading: boolean;
  canManage: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  typeFilter: string;
  onTypeFilterChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  viewMode: InventoryViewMode;
  onViewModeChange: (mode: InventoryViewMode) => void;
  onDelete: (id: string) => void | Promise<void>;
  csvImportOpen: boolean;
  onCsvImportOpenChange: (open: boolean) => void;
  onImported: () => void;
}

export function InventoryDirectory({
  items,
  allItems,
  loading,
  canManage,
  search,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  statusFilter,
  onStatusFilterChange,
  viewMode,
  onViewModeChange,
  onDelete,
  csvImportOpen,
  onCsvImportOpenChange,
  onImported,
}: InventoryDirectoryProps) {
  const { visible: visibleItems, hasMore, loadMore, total, visibleCount } = useWindowedList(items);
  const stats = useMemo(() => inventoryStats(allItems), [allItems]);

  const hasFilters =
    search.trim() !== '' || typeFilter !== FILTER_ALL || statusFilter !== FILTER_ALL;

  const clearFilters = () => {
    onSearchChange('');
    onTypeFilterChange(FILTER_ALL);
    onStatusFilterChange(FILTER_ALL);
  };

  return (
    <div className="directory-root inventory-directory">
      {/* Hero */}
      <motion.div
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        className="inventory-hero shrink-0"
      >
        <div className="inventory-hero-inner">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-teal-200/90 sm:text-xs">
              School property register
            </p>
            <h2 className="mt-1 text-lg font-extrabold tracking-tight text-white sm:text-xl">
              Inventory &amp; Assets
            </h2>
            <p className="mt-1 text-sm text-teal-100/90">
              Track equipment, books, furniture, and other school resources.
            </p>
          </div>
          {canManage && (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-10 border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                onClick={() => onCsvImportOpenChange(true)}
              >
                <Upload className="mr-2 h-4 w-4" />
                Import CSV
              </Button>
              <Button
                asChild
                size="sm"
                className="min-h-10 bg-white text-teal-900 hover:bg-teal-50"
              >
                <Link href="/dashboard/inventory/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Add asset
                </Link>
              </Button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="directory-stats-strip shrink-0"
      >
        <StatCard
          label="Asset records"
          value={stats.records}
          sub={`${stats.totalQty} total units`}
          icon={Package}
          accent="from-teal-500 to-teal-700"
        />
        <StatCard
          label="In use / active"
          value={stats.inUse}
          icon={Boxes}
          accent="from-emerald-500 to-emerald-700"
        />
        <StatCard
          label="Asset types"
          value={stats.types}
          sub={stats.locations ? `${stats.locations} locations` : undefined}
          icon={Layers}
          accent="from-violet-500 to-violet-700"
        />
        <StatCard
          label="Needs attention"
          value={stats.issues}
          sub="Damaged, lost, or disposed"
          icon={AlertTriangle}
          accent="from-amber-500 to-amber-600"
        />
      </motion.div>

      {/* Toolbar */}
      <div className="shrink-0 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm ring-1 ring-black/[0.02] sm:p-4">
        <div className="directory-toolbar">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search name, serial, location, book…"
              className="h-11 border-slate-200 bg-slate-50/50 pl-9 text-base sm:h-10 sm:text-sm"
            />
          </div>
          <div className="directory-toolbar-actions">
            <Select value={typeFilter} onValueChange={onTypeFilterChange}>
              <SelectTrigger className="h-11 w-full sm:h-10 sm:w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={FILTER_ALL}>All types</SelectItem>
                {INVENTORY_ASSET_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={onStatusFilterChange}>
              <SelectTrigger className="h-11 w-full sm:h-10 sm:w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={FILTER_ALL}>All status</SelectItem>
                {INVENTORY_ASSET_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex w-full rounded-lg border border-slate-200 bg-slate-50 p-0.5 sm:w-auto">
              <button
                type="button"
                onClick={() => onViewModeChange('list')}
                className={cn(
                  'touch-target-pill flex flex-1 items-center justify-center gap-1 rounded-md px-3 text-xs font-semibold transition-colors sm:flex-none',
                  viewMode === 'list'
                    ? 'bg-white text-teal-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800',
                )}
                aria-pressed={viewMode === 'list'}
              >
                <List className="h-4 w-4" />
                List
              </button>
              <button
                type="button"
                onClick={() => onViewModeChange('grid')}
                className={cn(
                  'touch-target-pill flex flex-1 items-center justify-center gap-1 rounded-md px-3 text-xs font-semibold transition-colors sm:flex-none',
                  viewMode === 'grid'
                    ? 'bg-white text-teal-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800',
                )}
                aria-pressed={viewMode === 'grid'}
              >
                <LayoutGrid className="h-4 w-4" />
                Grid
              </button>
            </div>
          </div>
        </div>
        {hasFilters && (
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
            <p className="text-xs text-slate-500">
              Showing <strong className="text-slate-800">{items.length}</strong> of{' '}
              {allItems.length}
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-900"
            >
              <Filter className="h-3.5 w-3.5" />
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Results panel */}
      <div className="directory-panel min-h-[12rem] flex-1">
        <DirectoryPanelHeader
          title="Asset register"
          count={items.length}
          countLabel="record"
          loading={loading}
        />
        <div className="directory-panel-scroll p-3 sm:p-4">
          {loading ? (
            <DirectorySkeleton label="Loading inventory…" />
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50">
                <Package className="h-8 w-8 text-teal-400" />
              </div>
              <p className="text-lg font-bold text-slate-900">No assets found</p>
              <p className="mt-1 max-w-sm text-sm text-slate-500">
                {hasFilters
                  ? 'Try different filters or clear your search.'
                  : canManage
                    ? 'Import your school inventory spreadsheet or add the first asset.'
                    : 'The register is empty or you do not have matching records.'}
              </p>
              {canManage && !hasFilters && (
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  <Button variant="outline" onClick={() => onCsvImportOpenChange(true)}>
                    <Upload className="mr-2 h-4 w-4" />
                    Import CSV
                  </Button>
                  <Button asChild className="bg-teal-700 hover:bg-teal-800">
                    <Link href="/dashboard/inventory/new">
                      <Plus className="mr-2 h-4 w-4" />
                      Add asset
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            <>
              <div className="inventory-grid">
                <AnimatePresence mode="popLayout">
                  {visibleItems.map((item) => (
                    <InventoryCard
                      key={item.id}
                      item={item}
                      canManage={canManage}
                      onDelete={onDelete}
                      variant="grid"
                    />
                  ))}
                </AnimatePresence>
              </div>
              {hasMore && (
                <LoadMoreBar visibleCount={visibleCount} total={total} onLoadMore={loadMore} />
              )}
            </>
          ) : (
            <>
              <ul className="space-y-2">
                <AnimatePresence mode="popLayout">
                  {visibleItems.map((item) => (
                    <InventoryCard
                      key={item.id}
                      item={item}
                      canManage={canManage}
                      onDelete={onDelete}
                      variant="list"
                    />
                  ))}
                </AnimatePresence>
              </ul>
              {hasMore && (
                <LoadMoreBar visibleCount={visibleCount} total={total} onLoadMore={loadMore} />
              )}
            </>
          )}
        </div>
      </div>

      <InventoryCsvImportDialog
        open={csvImportOpen}
        onClose={() => onCsvImportOpenChange(false)}
        onImported={onImported}
      />
    </div>
  );
}
