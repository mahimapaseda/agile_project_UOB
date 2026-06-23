'use client';

import Link from 'next/link';
import { Package, MapPin, Hash, BookOpen, Calendar, User, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { InventoryItem } from '@/types';
import { formatDate, cn } from '@/lib/utils';
import {
  inventoryStatusLabel,
  inventoryStatusTone,
  inventoryTypeIcon,
  INVENTORY_STATUS_STYLES,
} from '@/lib/inventory-display';
import { accentBarFromGradient } from '@/lib/stat-icon-accent';

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: string | number | null;
}) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="flex gap-3 py-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
        <p className="text-sm font-medium text-slate-900">{value}</p>
      </div>
    </div>
  );
}

interface InventoryItemDetailsProps {
  item: InventoryItem;
  canManage?: boolean;
}

export function InventoryItemDetails({ item, canManage = false }: InventoryItemDetailsProps) {
  const Icon = inventoryTypeIcon(item.assetType);
  const tone = inventoryStatusTone(item.assetStatus);
  const styles = INVENTORY_STATUS_STYLES[tone];

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className={cn('h-1.5', accentBarFromGradient(styles.accent))} />
        <div className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-4">
            <div className={cn('flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl', styles.icon)}>
              <Icon className="h-7 w-7" strokeWidth={2} aria-hidden />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-slate-900">{item.assetName}</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {item.assetType && <Badge variant="secondary">{item.assetType}</Badge>}
                <Badge className={cn('border', styles.badge)}>
                  {inventoryStatusLabel(item.assetStatus)}
                </Badge>
                <Badge variant="outline">Qty: {item.quantity}</Badge>
              </div>
            </div>
          </div>
          {canManage && (
            <Button asChild className="min-h-11 shrink-0 bg-teal-700 hover:bg-teal-800">
              <Link href={`/dashboard/inventory/${item.id}/edit`}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>
          )}
        </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <h3 className="mb-2 text-sm font-bold text-slate-900">Basic information</h3>
          <DetailRow icon={MapPin} label="Location" value={item.location} />
          <DetailRow icon={Hash} label="Serial no." value={item.serialNo} />
          <DetailRow icon={Package} label="Model" value={item.model} />
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <h3 className="mb-2 text-sm font-bold text-slate-900">Entry information</h3>
          <DetailRow icon={BookOpen} label="Book name" value={item.bookName} />
          <DetailRow icon={BookOpen} label="Page number" value={item.pageNumber} />
          <DetailRow
            icon={Calendar}
            label="Date entered"
            value={item.dateEntered ? formatDate(item.dateEntered) : undefined}
          />
          <DetailRow icon={User} label="Received from" value={item.receivedFrom} />
        </section>
      </div>

      {item.other && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <h3 className="mb-2 text-sm font-bold text-slate-900">Additional notes</h3>
          <p className="text-sm leading-relaxed text-slate-700">{item.other}</p>
        </section>
      )}
    </div>
  );
}
