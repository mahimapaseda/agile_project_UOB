'use client';

import { useMemo, useState } from 'react';
import { Delete, KeyRound } from 'lucide-react';
import { AccountType } from '@/types';
import { quickPinKeyLabel } from '@/lib/quick-pin';
import { cn } from '@/lib/utils';

const ACCOUNT_OPTIONS: { value: AccountType; label: string }[] = [
  { value: 'staff', label: 'Staff' },
  { value: 'student', label: 'Student' },
  { value: 'parent', label: 'Parent' },
];

const PIN_SLOTS = 6;

interface QuickPinLoginProps {
  loading: boolean;
  error?: string;
  onSubmit: (linkedId: string, pin: string, accountType: AccountType) => void;
}

export function QuickPinLogin({ loading, error, onSubmit }: QuickPinLoginProps) {
  const isRateLimited = error?.includes('Too many failed attempts') ?? false;
  const [accountType, setAccountType] = useState<AccountType>('staff');
  const [linkedId, setLinkedId] = useState('');
  const [pin, setPin] = useState('');

  const pinFilled = pin.length;
  const canSubmit = linkedId.trim().length > 0 && pin.length >= 4 && !loading;

  const keypad = useMemo(
    () => [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['', '0', 'del'],
    ],
    [],
  );

  const pressKey = (key: string) => {
    if (key === 'del') {
      setPin((p) => p.slice(0, -1));
      return;
    }
    if (!key || pin.length >= PIN_SLOTS) return;
    setPin((p) => p + key);
  };

  return (
    <div className="space-y-4">
      {error && (
        <div
          className={cn(
            'rounded-lg border px-3 py-2.5 text-xs leading-snug sm:text-sm',
            isRateLimited
              ? 'border-amber-200 bg-amber-50 text-amber-950'
              : 'border-red-200 bg-red-50 text-red-800',
          )}
          role="alert"
        >
          {error}
          {isRateLimited && (
            <p className="mt-1.5 text-[11px] text-amber-800/90 sm:text-xs">
              You can still sign in with your email and password below.
            </p>
          )}
        </div>
      )}

      <div className="flex items-start gap-2 rounded-lg border border-violet-200 bg-violet-50/80 px-3 py-2 text-[11px] leading-snug text-violet-900 sm:text-xs sm:leading-normal">
        <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
        <span>
          Enter your {quickPinKeyLabel(accountType).toLowerCase()} and 4–6 digit PIN (set when your
          login was created).
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {ACCOUNT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            disabled={loading}
            onClick={() => setAccountType(opt.value)}
            className={cn(
              'touch-target-pill rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
              accountType === opt.value
                ? 'bg-violet-700 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          {quickPinKeyLabel(accountType)}
        </label>
        <input
          type="text"
          value={linkedId}
          onChange={(e) => setLinkedId(e.target.value.toUpperCase())}
          placeholder={accountType === 'staff' ? 'SLP1967M325' : '1234'}
          disabled={loading}
          className="h-11 w-full rounded-xl border border-gray-200 bg-white/50 px-4 font-mono text-sm uppercase tracking-wide focus:border-violet-500 focus:outline-none focus:ring-4 focus:ring-violet-500/10"
          autoComplete="username"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">PIN</label>
        <div className="mb-3 flex justify-center gap-2">
          {Array.from({ length: PIN_SLOTS }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-3 w-3 rounded-full border-2 transition-colors',
                i < pinFilled
                  ? 'border-violet-600 bg-violet-600'
                  : 'border-slate-300 bg-white',
              )}
            />
          ))}
        </div>
        <div className="mx-auto grid w-full max-w-[240px] grid-cols-3 gap-1.5 sm:gap-2">
          {keypad.flat().map((key, idx) => {
            if (key === '') {
              return <div key={`empty-${idx}`} />;
            }
            if (key === 'del') {
              return (
                <button
                  key="del"
                  type="button"
                  disabled={loading || pin.length === 0}
                  onClick={() => pressKey('del')}
                  className="flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 sm:h-12"
                  aria-label="Delete digit"
                >
                  <Delete className="h-5 w-5" />
                </button>
              );
            }
            return (
              <button
                key={key}
                type="button"
                disabled={loading || pin.length >= PIN_SLOTS}
                onClick={() => pressKey(key)}
                className="h-11 rounded-xl border border-slate-200 bg-white text-base font-semibold text-slate-800 shadow-sm hover:bg-violet-50 hover:border-violet-200 disabled:opacity-40 sm:h-12 sm:text-lg"
              >
                {key}
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        disabled={!canSubmit}
        onClick={() => onSubmit(linkedId.trim(), pin, accountType)}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-violet-700 font-semibold text-white shadow-md transition-all hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Signing in…
          </>
        ) : (
          <>
            <KeyRound className="h-4 w-4" />
            Sign in with PIN
          </>
        )}
      </button>
    </div>
  );
}
