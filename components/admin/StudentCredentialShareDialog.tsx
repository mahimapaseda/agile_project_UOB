'use client';

import { useMemo, useState } from 'react';
import { AlertCircle, Check, Copy, ExternalLink, MessageCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { buildStudentLoginWhatsAppMessage, STUDENT_PORTAL_LOGIN_URL } from '@/lib/student-login-credentials';
import type { ProvisionStudentLoginResponse } from '@/lib/admin-auth-client';

interface StudentCredentialShareDialogProps {
  result: ProvisionStudentLoginResponse | null;
  onClose: () => void;
  onDone?: () => void;
}

export function StudentCredentialShareDialog({
  result,
  onClose,
  onDone,
}: StudentCredentialShareDialogProps) {
  const [copied, setCopied] = useState(false);

  const message = useMemo(() => {
    if (!result) return '';
    return buildStudentLoginWhatsAppMessage({
      studentName: result.studentName,
      admissionNumber: result.admissionNumber,
      email: result.email,
      temporaryPassword: result.temporaryPassword,
    });
  }, [result]);

  if (!result) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleClose = () => {
    onClose();
    onDone?.();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Student login ready</DialogTitle>
          <DialogDescription>
            {result.created
              ? `Created a temporary login for ${result.studentName}.`
              : `Issued a new temporary password for ${result.studentName}.`}
            {' '}Share it on WhatsApp or copy the message below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
            <p className="font-semibold text-slate-900">{result.studentName}</p>
            <p className="font-mono text-xs text-blue-700">{result.admissionNumber}</p>
            <dl className="mt-3 space-y-2 text-xs text-slate-700">
              <div>
                <dt className="font-semibold uppercase tracking-wide text-slate-500">Website</dt>
                <dd className="font-mono">{STUDENT_PORTAL_LOGIN_URL}</dd>
              </div>
              <div>
                <dt className="font-semibold uppercase tracking-wide text-slate-500">Username (email)</dt>
                <dd className="font-mono break-all">{result.email}</dd>
              </div>
              <div>
                <dt className="font-semibold uppercase tracking-wide text-slate-500">Temporary password</dt>
                <dd className="font-mono text-base font-bold text-slate-900">{result.temporaryPassword}</dd>
              </div>
            </dl>
          </div>

          {!result.whatsappPhone && (
            <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              No WhatsApp number on this student record. Add one in Students, or copy the message manually.
            </p>
          )}

          <pre className="max-h-40 overflow-auto rounded-xl border border-slate-200 bg-white p-3 text-[11px] leading-relaxed whitespace-pre-wrap text-slate-700">
            {message}
          </pre>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <Button type="button" variant="outline" onClick={handleCopy} className="gap-2">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied' : 'Copy message'}
          </Button>
          <div className="flex flex-wrap gap-2">
            {result.whatsappShareUrl ? (
              <Button asChild className="gap-2 bg-green-700 hover:bg-green-800">
                <a href={result.whatsappShareUrl} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-4 w-4" />
                  Share on WhatsApp
                  <ExternalLink className="h-3.5 w-3.5 opacity-70" />
                </a>
              </Button>
            ) : null}
            <Button type="button" onClick={handleClose}>
              Done
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
