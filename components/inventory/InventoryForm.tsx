'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { INVENTORY_ASSET_STATUSES, INVENTORY_ASSET_TYPES, InventoryItem } from '@/types';
import { Save } from 'lucide-react';

const schema = z.object({
  assetName: z.string().min(1, 'Asset name is required'),
  assetType: z.string().optional(),
  assetStatus: z.string().min(1, 'Status is required'),
  location: z.string().optional(),
  serialNo: z.string().optional(),
  model: z.string().optional(),
  bookName: z.string().optional(),
  pageNumber: z.string().optional(),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  dateEntered: z.string().optional(),
  receivedFrom: z.string().optional(),
  other: z.string().optional(),
});

export type InventoryFormData = z.infer<typeof schema>;

interface InventoryFormProps {
  initial?: Partial<InventoryItem>;
  saving?: boolean;
  submitLabel?: string;
  onSubmit: (data: InventoryFormData) => void | Promise<void>;
  onCancel?: () => void;
}

export function InventoryForm({
  initial,
  saving = false,
  submitLabel = 'Save item',
  onSubmit,
  onCancel,
}: InventoryFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<InventoryFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      assetName: initial?.assetName ?? '',
      assetType: initial?.assetType ?? '',
      assetStatus: initial?.assetStatus ?? 'active',
      location: initial?.location ?? '',
      serialNo: initial?.serialNo ?? '',
      model: initial?.model ?? '',
      bookName: initial?.bookName ?? '',
      pageNumber: initial?.pageNumber ?? '',
      quantity: initial?.quantity ?? 1,
      dateEntered: initial?.dateEntered ?? '',
      receivedFrom: initial?.receivedFrom ?? '',
      other: initial?.other ?? '',
    },
  });

  const assetStatus = watch('assetStatus');
  const assetType = watch('assetType');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <h3 className="text-sm font-bold text-slate-900">Basic information</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="assetName">Asset name *</Label>
            <Input id="assetName" {...register('assetName')} placeholder="e.g. Desktop Computer" />
            {errors.assetName && (
              <p className="mt-1 text-xs text-red-600">{errors.assetName.message}</p>
            )}
          </div>
          <div>
            <Label>Asset type</Label>
            <Select value={assetType || ''} onValueChange={(v) => setValue('assetType', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {INVENTORY_ASSET_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Asset status *</Label>
            <Select value={assetStatus} onValueChange={(v) => setValue('assetStatus', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {INVENTORY_ASSET_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.assetStatus && (
              <p className="mt-1 text-xs text-red-600">{errors.assetStatus.message}</p>
            )}
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="location">Location</Label>
            <Input id="location" {...register('location')} placeholder="e.g. Computer Lab 1" />
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <h3 className="text-sm font-bold text-slate-900">Technical details</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="serialNo">Serial no.</Label>
            <Input id="serialNo" {...register('serialNo')} placeholder="e.g. DGC-PC-001" />
          </div>
          <div>
            <Label htmlFor="model">Model</Label>
            <Input id="model" {...register('model')} placeholder="e.g. Dell OptiPlex" />
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <h3 className="text-sm font-bold text-slate-900">Entry information</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="bookName">Name of the book</Label>
            <Input id="bookName" {...register('bookName')} placeholder="For library items" />
          </div>
          <div>
            <Label htmlFor="pageNumber">Page number</Label>
            <Input id="pageNumber" {...register('pageNumber')} />
          </div>
          <div>
            <Label htmlFor="quantity">Number of items *</Label>
            <Input
              id="quantity"
              type="number"
              min={1}
              {...register('quantity', { valueAsNumber: true })}
            />
            {errors.quantity && (
              <p className="mt-1 text-xs text-red-600">{errors.quantity.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="dateEntered">Date entered</Label>
            <Input id="dateEntered" type="date" {...register('dateEntered')} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="receivedFrom">From whom received</Label>
            <Input id="receivedFrom" {...register('receivedFrom')} />
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <h3 className="text-sm font-bold text-slate-900">Additional information</h3>
        <div>
          <Label htmlFor="other">Other notes</Label>
          <Textarea id="other" rows={3} {...register('other')} placeholder="Any extra details…" />
        </div>
      </section>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={saving} className="min-h-11">
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
