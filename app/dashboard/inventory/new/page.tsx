'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { PageMain } from '@/components/layout/PageMain';
import { Button } from '@/components/ui/button';
import { AccessGate } from '@/components/auth/AccessGate';
import { InventoryForm, type InventoryFormData } from '@/components/inventory/InventoryForm';
import { canManageInventory } from '@/lib/access-control';
import { addInventoryItem } from '@/lib/firestore';

function NewInventoryPageContent() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (data: InventoryFormData) => {
    setSaving(true);
    setError('');
    try {
      const id = await addInventoryItem({
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
      setError('Could not save this item. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Header
        title="Add inventory item"
        subtitle="Register a school asset"
        backHref="/dashboard/inventory"
        backLabel="Back to inventory"
      />
      <PageMain>
        <Button asChild variant="ghost" className="mb-4 -ml-2 min-h-10">
          <Link href="/dashboard/inventory">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to inventory
          </Link>
        </Button>
        {error && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}
        <InventoryForm saving={saving} submitLabel="Add item" onSubmit={onSubmit} />
      </PageMain>
    </div>
  );
}

export default function NewInventoryPage() {
  return (
    <AccessGate allow={canManageInventory}>
      <NewInventoryPageContent />
    </AccessGate>
  );
}
