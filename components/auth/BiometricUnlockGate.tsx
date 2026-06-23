'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Fingerprint, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import {
  clearBiometricSessionUnlocked,
  getBiometricUnlockLabel,
  isBiometricUnlockEnabled,
  shouldLockAppWithBiometric,
  verifyBiometricUnlock,
} from '@/lib/biometric-unlock';
import { AppWelcomeBranding } from '@/components/AppWelcomeBranding';
import { Button } from '@/components/ui/button';

/** Brief delay so the lock overlay paints before the OS biometric sheet opens. */
const AUTO_PROMPT_DELAY_MS = 400;

function isUserCancelledUnlock(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return (
    msg.includes('cancel') ||
    msg.includes('abort') ||
    msg.includes('not allowed') ||
    msg.includes('timed out')
  );
}

export function BiometricUnlockGate({ children }: { children: React.ReactNode }) {
  const { user, userProfile, logout } = useAuth();
  const [locked, setLocked] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [error, setError] = useState('');
  const [autoPromptFailed, setAutoPromptFailed] = useState(false);
  const [pendingAutoPrompt, setPendingAutoPrompt] = useState(false);
  const unlockingRef = useRef(false);
  const autoPromptedRef = useRef(false);

  const biometricLabel = getBiometricUnlockLabel();

  const evaluateLock = useCallback(() => {
    if (!user) {
      setLocked(false);
      return;
    }
    setLocked(shouldLockAppWithBiometric(user.uid));
  }, [user]);

  useEffect(() => {
    evaluateLock();
  }, [evaluateLock, userProfile]);

  useEffect(() => {
    if (!locked) {
      autoPromptedRef.current = false;
      setAutoPromptFailed(false);
      setPendingAutoPrompt(false);
      setError('');
    }
  }, [locked]);

  useEffect(() => {
    if (!user || !isBiometricUnlockEnabled(user.uid)) return;

    const onHide = () => {
      clearBiometricSessionUnlocked();
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        autoPromptedRef.current = false;
        setLocked(shouldLockAppWithBiometric(user.uid));
      }
    };

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pagehide', onHide);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pagehide', onHide);
    };
  }, [user]);

  const handleUnlock = useCallback(
    async (options?: { isAuto?: boolean }) => {
      if (!user || unlockingRef.current) return;
      unlockingRef.current = true;
      setUnlocking(true);
      if (!options?.isAuto) setError('');
      try {
        await verifyBiometricUnlock(user.uid);
        setLocked(false);
        setAutoPromptFailed(false);
        setError('');
      } catch (err: unknown) {
        if (options?.isAuto) {
          setAutoPromptFailed(true);
          if (!isUserCancelledUnlock(err)) {
            setError(err instanceof Error ? err.message : 'Unlock failed. Try again.');
          }
        } else {
          setError(err instanceof Error ? err.message : 'Unlock failed. Try again.');
        }
      } finally {
        setUnlocking(false);
        unlockingRef.current = false;
      }
    },
    [user],
  );

  useEffect(() => {
    if (!locked || !user || autoPromptedRef.current) return;

    autoPromptedRef.current = true;
    setPendingAutoPrompt(true);
    const timer = window.setTimeout(() => {
      setPendingAutoPrompt(false);
      void handleUnlock({ isAuto: true });
    }, AUTO_PROMPT_DELAY_MS);

    return () => {
      window.clearTimeout(timer);
      setPendingAutoPrompt(false);
    };
  }, [locked, user, handleUnlock]);

  const handleSignOut = async () => {
    clearBiometricSessionUnlocked();
    await logout();
  };

  if (!locked) {
    return <>{children}</>;
  }

  const showWaiting = (pendingAutoPrompt || unlocking) && !autoPromptFailed;
  const showTryAgain = autoPromptFailed && !unlocking && !pendingAutoPrompt;

  return (
    <>
      <div
        className="surface-brand fixed inset-0 z-[100] flex flex-col items-center justify-center px-6 text-white"
        role="dialog"
        aria-modal="true"
        aria-labelledby="biometric-unlock-title"
        aria-busy={unlocking}
      >
        <div className="w-full max-w-sm text-center">
          <AppWelcomeBranding variant="dark" logoSize={72} className="mb-6" />
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-800 ring-1 ring-white/25">
            <Fingerprint className="h-8 w-8 text-accent-400" aria-hidden />
          </div>
          <h1 id="biometric-unlock-title" className="text-xl font-bold">
            Unlock {userProfile?.displayName ? 'your account' : 'Delta DBMS'}
          </h1>
          <p className="mt-2 text-sm text-blue-100">
            {showWaiting
              ? `Confirm ${biometricLabel} on this device…`
              : `Use ${biometricLabel} to open the school portal on this device.`}
          </p>

          {error && (
            <p className="mt-4 rounded-lg bg-red-500/20 px-3 py-2 text-sm text-red-100" role="alert">
              {error}
            </p>
          )}

          {showWaiting && (
            <div
              className="mx-auto mt-6 h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white"
              aria-hidden
            />
          )}

          {showTryAgain && (
            <Button
              type="button"
              size="lg"
              className="mt-6 w-full bg-white text-brand-900 hover:bg-blue-50"
              disabled={unlocking}
              onClick={() => void handleUnlock()}
            >
              {`Try ${biometricLabel} again`}
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            className="mt-3 w-full text-blue-100 hover:bg-white/10 hover:text-white"
            onClick={() => void handleSignOut()}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign in with password instead
          </Button>
        </div>
      </div>
    </>
  );
}
