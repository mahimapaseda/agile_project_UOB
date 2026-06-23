'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { PageMain } from '@/components/layout/PageMain';
import { Button } from '@/components/ui/button';
import { AccessGate } from '@/components/auth/AccessGate';
import { InventoryForm, type InventoryFormData } from '@/components/inventory/InventoryForm';
import { canManageInventory } from '@/lib/access-control';
import { getInventoryItem, updateInventoryItem } from '@/lib/firestore';
import { InventoryItem } from '@/types';

function EditInventoryPageContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getInventoryItem(id);
        if (!cancelled) setItem(data);
      } catch {
        if (!cancelled) setItem(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const onSubmit = async (data: InventoryFormData) => {
    setSaving(true);
    setError('');
    try {
      await updateInventoryItem(id, {
        assetName: data.assetName,
        assetType: data.assetType || undefined,
        assetStatus: data.assetStatus,
        location: data.location || undefined,
        serialNo: data.serialNo || undefined,
        model: data.model || undefined,
        bookName: data.bookName || undefined,
        pageNumber: data.pageNumber || undefined,
        quantity: data.quantity,
        dateEntered: data.dateEntered || undefined,
        receivedFrom: data.receivedFrom || undefined,
        other: data.other || undefined,
      });
      router.push(`/dashboard/inventory/${id}`);
    } catch {
      setError('Could not update this item. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <Header
          title="Edit item"
          backHref="/dashboard/inventory"
          backLabel="Back to inventory"
        />
        <PageMain className="flex items-center justify-center">
          <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-blue-600 border-t-transparent" />
        </PageMain>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <Header
          title="Item not found"
          backHref="/dashboard/inventory"
          backLabel="Back to inventory"
        />
        <PageMain className="text-center">
          <Button asChild className="mt-4">
            <Link href="/dashboard/inventory">Back to inventory</Link>
          </Button>
        </PageMain>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Header
        title="Edit inventory item"
        subtitle={item.assetName}
        backHref={`/dashboard/inventory/${id}`}
        backLabel="Back to item"
      />
      <PageMain>
        <Button asChild variant="ghost" className="mb-4 -ml-2 min-h-10">
          <Link href={`/dashboard/inventory/${id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to item
          </Link>
        </Button>
        {error && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}
        <InventoryForm
          initial={item}
          saving={saving}
          submitLabel="Save changes"
          onSubmit={onSubmit}
        />
      </PageMain>
    </div>
  );
}

export default function EditInventoryPage() {
  return (
    <AccessGate allow={canManageInventory}>
      <EditInventoryPageContent />
    </AccessGate>
  );
}
