'use client';

import { useState } from 'react';
import { AlertCircle, ExternalLink, Loader2, MessageCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { auth } from '@/lib/firebase';
import {
  requestProvisionStudentLogins,
  type BulkProvisionStudentRow,
} from '@/lib/admin-auth-client';

interface StudentBulkProvisionDialogProps {
  open: boolean;
  onClose: () => void;
  onComplete?: () => void;
  admissionNumbers?: string[];
  onlyWithoutLogin?: boolean;
  title?: string;
  description?: string;
}

export function StudentBulkProvisionDialog({
  open,
  onClose,
  onComplete,
  admissionNumbers,
  onlyWithoutLogin = true,
  title = 'Provision student logins',
  description = 'Creates temporary passwords for students without logins. Share each one on WhatsApp.',
}: StudentBulkProvisionDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<BulkProvisionStudentRow[] | null>(null);

  const runProvision = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setError('Sign in again to continue.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const idToken = await currentUser.getIdToken();
      const response = await requestProvisionStudentLogins(idToken, {
        admissionNumbers,
        onlyWithoutLogin,
      });
      setResults(response.results);
      onComplete?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to provision student logins.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setResults(null);
    setError('');
    onClose();
  };

  const successCount = results?.filter((row) => row.success).length ?? 0;
  const failCount = results ? results.length - successCount : 0;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {!results ? (
          <div className="space-y-3">
            {error && (
              <p className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </p>
            )}
            <p className="text-sm text-slate-600">
              Each student receives a temporary password and must set their own password at first sign-in.
              WhatsApp share opens only when the student record has a WhatsApp or phone number.
            </p>
          </div>
        ) : (
          <div className="max-h-[50vh] space-y-3 overflow-auto">
            <p className="text-sm font-medium text-slate-800">
              {successCount} created · {failCount} skipped/failed
            </p>
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
              {results.map((row) => (
                <li key={row.admissionNumber} className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{row.studentName}</p>
                    <p className="font-mono text-[11px] text-blue-700">{row.admissionNumber}</p>
                    {row.success ? (
                      <p className="mt-1 truncate text-[11px] text-slate-600">
                        {row.email} · temp: <span className="font-mono font-semibold">{row.temporaryPassword}</span>
                      </p>
                    ) : (
                      <p className="mt-1 text-[11px] text-amber-800">{row.error}</p>
                    )}
                  </div>
                  {row.success && row.whatsappShareUrl ? (
                    <Button asChild size="sm" className="shrink-0 bg-green-700 hover:bg-green-800">
                      <a href={row.whatsappShareUrl} target="_blank" rel="noopener noreferrer">
                        <MessageCircle className="h-3.5 w-3.5" />
                        WhatsApp
                        <ExternalLink className="h-3 w-3 opacity-60" />
                      </a>
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        )}

        <DialogFooter>
          {!results ? (
            <>
              <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
                Cancel
              </Button>
              <Button type="button" onClick={runProvision} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Provisioning…
                  </>
                ) : (
                  'Start provisioning'
                )}
              </Button>
            </>
          ) : (
            <Button type="button" onClick={handleClose}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
