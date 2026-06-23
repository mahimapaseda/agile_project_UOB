'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { PWA, PWA_ICON_LOGO_PATH, PWA_ORIGIN } from '@/lib/pwa-config';
import { isAndroidDevice } from '@/lib/android-device';
import { cn } from '@/lib/utils';

const DISMISS_KEY = 'dgc-dbms-pwa-install-dismissed';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function getInstallHostname(): string {
  if (typeof window !== 'undefined') return window.location.hostname;
  try {
    return new URL(PWA_ORIGIN).hostname;
  } catch {
    return 'dgmvdbms.vercel.app';
  }
}

/** Dashboard routes use the mobile bottom nav (hidden from lg up). */
function useAboveBottomNav(): boolean {
  const pathname = usePathname() ?? '';
  return pathname === '/dashboard' || pathname.startsWith('/dashboard/');
}

function useIsLoginPage(): boolean {
  const pathname = usePathname() ?? '';
  return pathname === '/login';
}

/**
 * Chrome-style install infobar, responsive for phone, tablet, and desktop.
 * - Phone: full-width bar above bottom nav (dashboard) or screen bottom (login)
 * - Tablet: centered card, filled Install button, larger icon
 * - Desktop (lg+): floating bottom-right chip (no bottom-nav offset)
 */
export function PwaInstallHint() {
  const aboveBottomNav = useAboveBottomNav();
  const isLoginPage = useIsLoginPage();
  const [show, setShow] = useState(false);
  const [hostname, setHostname] = useState('');
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);
  const [android, setAndroid] = useState(false);

  useEffect(() => {
    if (isStandaloneDisplay() || isLoginPage) return;

    try {
      if (localStorage.getItem(DISMISS_KEY) === '1') return;
    } catch {
      /* ignore */
    }

    setHostname(getInstallHostname());
    const onAndroid = isAndroidDevice();
    setAndroid(onAndroid);

    if (onAndroid) {
      setShow(true);
      return;
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShow(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  }, [isLoginPage]);

  const dismiss = useCallback(() => {
    setShow(false);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
  }, []);

  const onInstallClick = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') dismiss();
    } catch {
      /* ignore */
    } finally {
      setInstalling(false);
      setDeferredPrompt(null);
    }
  };

  const visible =
    !isLoginPage && show && !isStandaloneDisplay() && (android || deferredPrompt);

  useEffect(() => {
    if (!visible) {
      document.documentElement.removeAttribute('data-pwa-install');
      return;
    }
    document.documentElement.setAttribute('data-pwa-install', '');
    return () => document.documentElement.removeAttribute('data-pwa-install');
  }, [visible]);

  const installAction = android ? (
    <Link href="/install-android" className="pwa-install-bar__action">
      Install
    </Link>
  ) : (
    <button
      type="button"
      onClick={onInstallClick}
      disabled={installing}
      className="pwa-install-bar__action"
    >
      {installing ? '…' : 'Install'}
    </button>
  );

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="region"
          aria-label="Install app"
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          className={cn(
            'pwa-install-anchor',
            aboveBottomNav && 'pwa-install-anchor--above-nav',
          )}
        >
          <div className="pwa-install-bar">
            <Image
              src={PWA_ICON_LOGO_PATH}
              alt=""
              width={48}
              height={48}
              className="pwa-install-bar__icon"
              sizes="(min-width: 768px) 48px, 40px"
            />
            <div className="pwa-install-bar__body">
              <p className="pwa-install-bar__title">Install {PWA.shortName}</p>
              <p className="pwa-install-bar__host">{hostname}</p>
            </div>
            {installAction}
            <button
              type="button"
              onClick={dismiss}
              className="pwa-install-bar__dismiss touch-target-icon"
              aria-label="Dismiss install prompt"
              data-icon-only="true"
            >
              <X className="h-4 w-4" strokeWidth={2.25} aria-hidden />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
