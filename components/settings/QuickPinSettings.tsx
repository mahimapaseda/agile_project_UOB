'use client';

import { useState } from 'react';
import { AlertCircle, Check, KeyRound, Delete } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { requestSetQuickPin } from '@/lib/pin-auth-client';
import { isValidQuickPin, quickPinKeyLabel } from '@/lib/quick-pin';
import { cn } from '@/lib/utils';

const PIN_SLOTS = 6;
const KEYPAD = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', 'del'],
];

export function QuickPinSettings() {
  const { user, userProfile, refreshProfile } = useAuth();
  const [pin, setPin] = useState('');
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  const [confirmPin, setConfirmPin] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!userProfile?.linkedId) {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <KeyRound className="h-4 w-4 text-violet-600" />
          <h3 className="text-sm font-bold text-slate-900">Quick PIN access</h3>
        </div>
        <p className="text-sm text-slate-500">
          Your account is not linked to a staff ID or admission number. Contact an administrator.
        </p>
      </div>
    );
  }

  const currentPin = step === 'enter' ? pin : confirmPin;
  const setCurrentPin = step === 'enter' ? setPin : setConfirmPin;

  const pressKey = (key: string) => {
    if (key === 'del') {
      setCurrentPin((p) => p.slice(0, -1));
      return;
    }
    if (!key || currentPin.length >= PIN_SLOTS) return;
    setCurrentPin((p) => p + key);
  };

  const handleNext = () => {
    if (!isValidQuickPin(pin)) {
      setError('PIN must be 4–6 digits.');
      return;
    }
    setError('');
    setStep('confirm');
  };

  const handleConfirm = async () => {
    if (!user || !userProfile.linkedId) return;
    if (pin !== confirmPin) {
      setError('PINs do not match. Start again.');
      setStep('enter');
      setPin('');
      setConfirmPin('');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const idToken = await user.getIdToken();
      await requestSetQuickPin(idToken, {
        uid: user.uid,
        linkedId: userProfile.linkedId,
        accountType: userProfile.accountType,
        pin,
      });
      setPin('');
      setConfirmPin('');
      setStep('enter');
      setSuccess(true);
      await refreshProfile();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not save PIN.');
      setStep('enter');
      setPin('');
      setConfirmPin('');
    } finally {
      setSaving(false);
    }
  };

  const label = step === 'enter' ? 'Enter new PIN' : 'Confirm PIN';
  const displayPin = currentPin;

  return (
    <div className="rounded-2xl border border-violet-200/80 bg-white shadow-sm overflow-hidden">
      <div className="surface-violet border-b border-violet-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-violet-200" />
          <h3 className="text-sm font-bold text-white">Quick PIN access</h3>
          {userProfile.quickPinEnabled && (
            <span className="ml-auto rounded-full bg-green-400/20 border border-green-400/40 px-2 py-0.5 text-[10px] font-bold text-green-300 uppercase tracking-wide">
              Active
            </span>
          )}
        </div>
        <p className="mt-1.5 text-[12px] text-violet-200">
          Sign in with your {quickPinKeyLabel(userProfile.accountType).toLowerCase()}{' '}
          <span className="font-mono font-semibold text-white">{userProfile.linkedId}</span>{' '}
          + a 4–6 digit PIN.
        </p>
      </div>

      <div className="p-5">
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            <Check className="h-4 w-4 shrink-0" />
            Quick PIN saved. Use it on the login page.
          </div>
        )}

        <p className="mb-3 text-center text-sm font-semibold text-slate-700">{label}</p>

        {/* PIN dot display */}
        <div className="mb-5 flex justify-center gap-2.5">
          {Array.from({ length: PIN_SLOTS }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-3.5 w-3.5 rounded-full border-2 transition-all duration-150',
                i < displayPin.length
                  ? 'scale-110 border-violet-600 bg-violet-600 shadow-sm shadow-violet-200'
                  : 'border-slate-300 bg-white',
              )}
            />
          ))}
        </div>

        {/* Keypad */}
        <div className="mx-auto grid max-w-[220px] grid-cols-3 gap-2 mb-5">
          {KEYPAD.flat().map((key, idx) => {
            if (key === '') return <div key={`empty-${idx}`} />;
            if (key === 'del') {
              return (
                <button
                  key="del"
                  type="button"
                  onClick={() => pressKey('del')}
                  disabled={saving}
                  className="flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 active:scale-95 transition-all disabled:opacity-40"
                  aria-label="Delete"
                >
                  <Delete className="h-4 w-4" />
                </button>
              );
            }
            return (
              <button
                key={key}
                type="button"
                onClick={() => pressKey(key)}
                disabled={saving || currentPin.length >= PIN_SLOTS}
                className="h-12 rounded-xl border border-slate-200 bg-white text-base font-bold text-slate-800 shadow-sm hover:bg-violet-50 hover:border-violet-200 active:scale-95 transition-all disabled:opacity-40"
              >
                {key}
              </button>
            );
          })}
        </div>

        {/* Action buttons */}
        {step === 'enter' ? (
          <button
            type="button"
            onClick={handleNext}
            disabled={displayPin.length < 4 || saving}
            className="w-full rounded-xl bg-violet-700 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-violet-800 disabled:opacity-50 transition-colors"
          >
            Next →
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setStep('enter'); setConfirmPin(''); setError(''); }}
              className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={displayPin.length < 4 || saving}
              className="flex-1 rounded-xl bg-violet-700 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-violet-800 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving…' : userProfile.quickPinEnabled ? 'Update PIN' : 'Enable PIN'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
