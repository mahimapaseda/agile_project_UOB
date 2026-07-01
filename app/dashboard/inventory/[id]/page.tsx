'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { PageMain } from '@/components/layout/PageMain';
import { Button } from '@/components/ui/button';
import { AccessGate } from '@/components/auth/AccessGate';
import { InventoryItemDetails } from '@/components/inventory/InventoryItemDetails';
import { useAuth } from '@/lib/auth-context';
import { canManageInventory, canViewInventory } from '@/lib/access-control';
import { getInventoryItem } from '@/lib/firestore';
import { InventoryItem } from '@/types';

function InventoryDetailPageContent() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const { userProfile } = useAuth();
  const canManage = canManageInventory(userProfile);

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

  if (loading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <Header
          title="Inventory item"
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
          <p className="text-slate-600">This inventory record could not be found.</p>
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
        title={item.assetName}
        subtitle={item.assetType || 'School asset'}
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
        <InventoryItemDetails item={item} canManage={canManage} />
      </PageMain>
    </div>
  );
}

export default function InventoryDetailPage() {
  return (
    <AccessGate allow={canViewInventory}>
      <InventoryDetailPageContent />
    </AccessGate>
  );
}
