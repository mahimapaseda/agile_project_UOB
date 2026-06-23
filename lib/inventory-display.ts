import {
  BookOpen,
  Box,
  Dumbbell,
  FlaskConical,
  Monitor,
  Package,
  type LucideIcon,
} from 'lucide-react';
import { INVENTORY_ASSET_STATUSES, InventoryItem } from '@/types';

export function inventoryStatusLabel(status: string): string {
  return INVENTORY_ASSET_STATUSES.find((s) => s.value === status)?.label ?? status;
}

export function inventoryTypeIcon(type?: string): LucideIcon {
  const t = (type ?? '').toLowerCase();
  if (t.includes('book')) return BookOpen;
  if (t.includes('it') || t.includes('computer')) return Monitor;
  if (t.includes('sport')) return Dumbbell;
  if (t.includes('lab')) return FlaskConical;
  if (t.includes('furniture')) return Box;
  return Package;
}

export type InventoryStatusTone = 'success' | 'info' | 'warning' | 'danger' | 'muted';

export function inventoryStatusTone(status: string): InventoryStatusTone {
  if (status === 'damaged' || status === 'lost') return 'danger';
  if (status === 'disposed') return 'muted';
  if (status === 'in_storage') return 'info';
  if (status === 'in_use') return 'success';
  return 'success';
}

export const INVENTORY_STATUS_STYLES: Record<
  InventoryStatusTone,
  { badge: string; icon: string; accent: string }
> = {
  success: {
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200/60',
    icon: 'bg-emerald-100 text-emerald-700',
    accent: 'from-emerald-500 to-emerald-700',
  },
  info: {
    badge: 'bg-sky-100 text-sky-800 border-sky-200/60',
    icon: 'bg-sky-100 text-sky-700',
    accent: 'from-sky-500 to-sky-700',
  },
  warning: {
    badge: 'bg-amber-100 text-amber-900 border-amber-200/60',
    icon: 'bg-amber-100 text-amber-800',
    accent: 'from-amber-500 to-amber-600',
  },
  danger: {
    badge: 'bg-red-100 text-red-800 border-red-200/60',
    icon: 'bg-red-100 text-red-700',
    accent: 'from-red-500 to-red-700',
  },
  muted: {
    badge: 'bg-slate-100 text-slate-700 border-slate-200/60',
    icon: 'bg-slate-100 text-slate-600',
    accent: 'from-slate-500 to-slate-600',
  },
};

export function inventoryStats(items: InventoryItem[]) {
  const totalQty = items.reduce((sum, i) => sum + (i.quantity ?? 1), 0);
  const inUse = items.filter((i) => i.assetStatus === 'in_use' || i.assetStatus === 'active').length;
  const issues = items.filter(
    (i) => i.assetStatus === 'damaged' || i.assetStatus === 'lost' || i.assetStatus === 'disposed',
  ).length;
  const types = new Set(items.map((i) => i.assetType).filter(Boolean)).size;
  const locations = new Set(items.map((i) => i.location).filter(Boolean)).size;
  return { records: items.length, totalQty, inUse, issues, types, locations };
}
