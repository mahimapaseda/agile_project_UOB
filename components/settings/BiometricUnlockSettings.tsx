'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Check, Fingerprint, Smartphone } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import {
  disableBiometricUnlock,
  getBiometricUnlockLabel,
  isBiometricUnlockEnabled,
  isBiometricUnlockSupported,
  registerBiometricUnlock,
} from '@/lib/biometric-unlock';
import {
  isAppleMobileBrowserTab,
  shouldOfferInstalledAppFeatures,
} from '@/lib/installed-app';
import { cn } from '@/lib/utils';

export function BiometricUnlockSettings() {
  const { user, userProfile } = useAuth();
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    const ok = await isBiometricUnlockSupported();
    setSupported(ok);
    setEnabled(isBiometricUnlockEnabled(user.uid));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleToggle = async () => {
    if (!user || !userProfile) return;
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      if (enabled) {
        disableBiometricUnlock(user.uid);
        setEnabled(false);
        setSuccess('Biometric unlock turned off.');
      } else {
        await registerBiometricUnlock(
          user.uid,
          userProfile.email,
          userProfile.displayName,
        );
        setEnabled(true);
        setSuccess(`${getBiometricUnlockLabel()} is enabled for this device.`);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not update biometric unlock.');
    } finally {
      setBusy(false);
    }
  };

  const installed = shouldOfferInstalledAppFeatures();
  const safariTab = isAppleMobileBrowserTab();
  const biometricLabel = getBiometricUnlockLabel();

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Fingerprint className="h-4 w-4 text-emerald-600" />
        <h3 className="text-sm font-bold text-slate-900">Biometric unlock</h3>
      </div>

      {safariTab && (
        <div className="mb-4 flex gap-2 rounded-xl border border-blue-100 bg-blue-50/80 p-3 text-xs leading-relaxed text-blue-900">
          <Smartphone className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">Install to Home Screen first (iPhone)</p>
            <p className="mt-1">
              Face ID / Touch ID unlock only works in the <strong>installed app</strong>, not in a
              Safari tab.
            </p>
            <Link
              href="/install-ios"
              className="mt-2 inline-block font-semibold text-blue-700 underline underline-offset-2"
            >
              iPhone install guide →
            </Link>
          </div>
        </div>
      )}

      {!installed && !safariTab && (
        <div className="mb-4 flex gap-2 rounded-xl border border-blue-100 bg-blue-50/80 p-3 text-xs leading-relaxed text-blue-900">
          <Smartphone className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Add this app to your <strong>home screen</strong> first. Biometric unlock only works in
            the installed app on a phone or tablet.
          </p>
        </div>
      )}

      {installed && (
        <p className="mb-4 text-[12px] leading-relaxed text-slate-500">
          When enabled, opening the installed app automatically prompts for {biometricLabel} before
          showing your dashboard (including when you return from another app). Your Firebase login
          stays signed in — this is a device privacy lock on this phone or tablet, not a separate
          server password.
        </p>
      )}

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          <Check className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {installed ? (
        <>
          <label
            className={cn(
              'flex items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-colors',
              supported && !loading
                ? 'cursor-pointer border-slate-200 bg-slate-50/80 hover:bg-slate-50'
                : 'cursor-not-allowed border-slate-100 bg-slate-50 opacity-70',
            )}
          >
            <span className="text-sm font-medium text-slate-800">
              {loading ? 'Checking device…' : `Unlock with ${biometricLabel}`}
            </span>
            <input
              type="checkbox"
              className="h-5 w-5 shrink-0 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              checked={enabled}
              disabled={!supported || loading || busy || !user}
              onChange={() => void handleToggle()}
            />
          </label>

          {!loading && supported && !enabled && (
            <p className="mt-3 text-xs text-slate-500">
              Turn on the switch — your device will ask for {biometricLabel} to confirm.
            </p>
          )}

          {!loading && !supported && (
            <p className="mt-3 text-xs text-amber-800">
              Update your device OS, ensure biometrics are set up in system Settings, then try again.
              Open Delta DBMS from the home screen icon (not a browser tab).
            </p>
          )}
        </>
      ) : null}
    </div>
  );
}
