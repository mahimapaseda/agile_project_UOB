'use client';

import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';
import { AlertCircle, Check, ExternalLink, MessageCircle, Phone, Unlink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth-context';
import { isAdmin } from '@/lib/access-control';
import { buildWhatsAppHref } from '@/lib/contact-links';
import { formatLocalMobile, isValidSriLankaMobile } from '@/lib/phone-numbers';
import {
  connectSchoolWhatsApp,
  disconnectSchoolWhatsApp,
  getSchoolIntegrations,
} from '@/lib/school-integrations';
import { SchoolIntegrations } from '@/types';
import { cn } from '@/lib/utils';
import { ContactActionLink } from '@/components/contact/ContactActionLink';

const schema = z.object({
  phone: z
    .string()
    .min(1, 'Enter the WhatsApp phone number')
    .refine((value) => isValidSriLankaMobile(value), 'Enter a valid Sri Lanka mobile number (e.g. 0771234567)'),
});

type FormData = z.infer<typeof schema>;

function formatConnectedAt(settings: SchoolIntegrations | null): string | null {
  const ts = settings?.whatsappConnectedAt;
  if (!ts || typeof ts.toDate !== 'function') return null;
  return ts.toDate().toLocaleString('en-LK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function WhatsAppIntegrationSettings() {
  const { user, userProfile } = useAuth();
  const [settings, setSettings] = useState<SchoolIntegrations | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { phone: '' },
  });

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getSchoolIntegrations();
      setSettings(data);
      reset({ phone: data?.whatsappPhone ?? '' });
    } catch {
      setError('Could not load WhatsApp settings. Check Firestore rules are published.');
    } finally {
      setLoading(false);
    }
  }, [reset]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  if (!userProfile || !user) {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
        Sign in to manage integrations.
      </div>
    );
  }

  if (!isAdmin(userProfile)) {
    return (
      <div className="rounded-2xl border border-amber-200/80 bg-amber-50/60 p-6 text-sm text-amber-900 shadow-sm">
        Only the Principal and Technical Officer can connect the school WhatsApp account.
      </div>
    );
  }

  const connectedPhone = settings?.whatsappPhone?.trim() || '';
  const isConnected = Boolean(connectedPhone);
  const waHref = connectedPhone ? buildWhatsAppHref(connectedPhone) : null;
  const connectedAt = formatConnectedAt(settings);

  const onConnect = async (data: FormData) => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const phone = formatLocalMobile(data.phone);
      await connectSchoolWhatsApp({
        phone,
        updatedByUid: user.uid,
        updatedByName: userProfile.displayName,
      });
      await loadSettings();
      setSuccess('School WhatsApp account connected.');
    } catch {
      setError('Could not save WhatsApp number. Check Firestore rules are published.');
    } finally {
      setSaving(false);
    }
  };

  const onDisconnect = async () => {
    if (!window.confirm('Disconnect the school WhatsApp account?')) return;
    setDisconnecting(true);
    setError('');
    setSuccess('');
    try {
      await disconnectSchoolWhatsApp(user.uid, userProfile.displayName);
      await loadSettings();
      reset({ phone: '' });
      setSuccess('WhatsApp account disconnected.');
    } catch {
      setError('Could not disconnect WhatsApp. Please try again.');
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3.5">
          <MessageCircle className="h-4 w-4 text-green-600" />
          <h3 className="text-sm font-bold text-slate-900">School WhatsApp</h3>
        </div>

        <div className="space-y-4 p-5">
          <p className="text-[13px] leading-relaxed text-slate-600">
            Connect the official school WhatsApp number used for parent and student messages.
            Enter the phone number registered with WhatsApp on this device or SIM.
          </p>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-7 w-7 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
            </div>
          ) : (
            <>
              <div
                className={cn(
                  'rounded-xl border px-4 py-3.5',
                  isConnected
                    ? 'border-green-200 bg-green-50/70'
                    : 'border-slate-200 bg-slate-50/60',
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-500">
                      Status
                    </p>
                    <p className="mt-1 flex items-center gap-2 text-sm font-bold text-slate-900">
                      {isConnected ? (
                        <>
                          <span className="inline-flex h-2 w-2 rounded-full bg-green-500" />
                          Connected
                        </>
                      ) : (
                        <>
                          <span className="inline-flex h-2 w-2 rounded-full bg-slate-300" />
                          Not connected
                        </>
                      )}
                    </p>
                    {isConnected && (
                      <div className="mt-2 space-y-1">
                        <p className="flex items-center gap-2 text-sm font-medium text-slate-800">
                          <Phone className="h-3.5 w-3.5 text-green-700" />
                          <ContactActionLink kind="whatsapp" value={connectedPhone} />
                        </p>
                        {connectedAt && (
                          <p className="text-[11px] text-slate-500">Connected {connectedAt}</p>
                        )}
                        {settings?.whatsappUpdatedByName && (
                          <p className="text-[11px] text-slate-500">
                            Last updated by {settings.whatsappUpdatedByName}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {isConnected && waHref && (
                    <Button asChild variant="outline" size="sm" className="border-green-200 text-green-800">
                      <a href={waHref} target="_blank" rel="noopener noreferrer">
                        Open in WhatsApp
                        <ExternalLink className="h-3.5 w-3.5 opacity-70" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>

              <form onSubmit={handleSubmit(onConnect)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="whatsapp-phone">WhatsApp phone number</Label>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="whatsapp-phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="0771234567"
                      className="pl-9"
                      {...register('phone')}
                    />
                  </div>
                  {errors.phone && (
                    <p className="flex items-center gap-1.5 text-xs text-red-600">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      {errors.phone.message}
                    </p>
                  )}
                  <p className="text-[11px] text-slate-500">
                    Use the mobile number linked to the school WhatsApp account (07… or +94…).
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="submit"
                    disabled={saving || disconnecting}
                    className="bg-green-700 hover:bg-green-800"
                  >
                    {saving ? 'Saving…' : isConnected ? 'Update number' : 'Connect account'}
                  </Button>
                  {isConnected && (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={saving || disconnecting}
                      onClick={onDisconnect}
                      className="border-red-200 text-red-700 hover:bg-red-50"
                    >
                      <Unlink className="h-4 w-4" />
                      {disconnecting ? 'Disconnecting…' : 'Disconnect'}
                    </Button>
                  )}
                </div>
              </form>
            </>
          )}

          {error && (
            <p className="flex items-center gap-1.5 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </p>
          )}
          {success && (
            <p className="flex items-center gap-1.5 rounded-lg border border-green-100 bg-green-50 px-3 py-2 text-xs text-green-800">
              <Check className="h-3.5 w-3.5 shrink-0" />
              {success}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
