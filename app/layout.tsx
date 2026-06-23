import type { Metadata, Viewport } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { HydrationGate } from '@/components/HydrationGate';
import { PreHydrateScript } from '@/components/PreHydrateScript';
import { PwaRegister } from '@/components/PwaRegister';
import { PwaInstallHint } from '@/components/PwaInstallHint';
import { PortraitOrientationGuard } from '@/components/PortraitOrientationGuard';
import { DisplayPreferencesApplier } from '@/components/DisplayPreferencesApplier';
import { PWA, PWA_ORIGIN } from '@/lib/pwa-config';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' });

export const metadata: Metadata = {
  metadataBase: new URL(PWA_ORIGIN),
  applicationName: PWA.shortName,
  title: {
    default: PWA.name,
    template: `%s · ${PWA.shortName}`,
  },
  description: PWA.description,
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: PWA.shortName,
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/school-logo.png', sizes: '512x512', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: PWA.themeColor,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full`} suppressHydrationWarning>
      <body className="h-full bg-slate-50" suppressHydrationWarning>
        <PreHydrateScript />
        <DisplayPreferencesApplier />
        <PwaRegister />
        <PortraitOrientationGuard />
        <HydrationGate>
          <AuthProvider>
            {children}
            <PwaInstallHint />
          </AuthProvider>
        </HydrationGate>
      </body>
    </html>
  );
}
