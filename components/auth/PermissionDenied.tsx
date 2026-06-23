import Link from 'next/link';
import { ShieldX } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PermissionDeniedProps {
  title?: string;
  message?: string;
  backHref?: string;
  backLabel?: string;
}

export function PermissionDenied({
  title = 'Access denied',
  message = 'You do not have permission to view this page.',
  backHref = '/dashboard',
  backLabel = 'Back to dashboard',
}: PermissionDeniedProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50">
        <ShieldX className="h-7 w-7 text-amber-600" aria-hidden />
      </div>
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-slate-600">{message}</p>
      <Button asChild className="mt-6" variant="outline">
        <Link href={backHref}>{backLabel}</Link>
      </Button>
    </div>
  );
}
