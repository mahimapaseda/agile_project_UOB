import Link from 'next/link';
import { SchoolLogo } from '@/components/SchoolLogo';
import { Button } from '@/components/ui/button';
import { PWA, PWA_ORIGIN } from '@/lib/pwa-config';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  ExternalLink,
  Share,
  Smartphone,
  SquarePlus,
} from 'lucide-react';

export const metadata = {
  title: 'Install on iPhone & iPad',
  description: `Add ${PWA.shortName} to your Home Screen using Safari`,
};

const INSTALL_STEPS = [
  {
    icon: Smartphone,
    title: 'Use Safari',
    body: 'Open Safari on your iPhone or iPad (not WhatsApp or Facebook’s in-app browser).',
  },
  {
    icon: ExternalLink,
    title: 'Open the school site',
    body: `Go to ${PWA_ORIGIN} — use https:// in the address bar.`,
  },
  {
    icon: Share,
    title: 'Tap Share',
    body: 'Tap the Share button (square with an arrow pointing up) at the bottom or top of Safari.',
  },
  {
    icon: SquarePlus,
    title: 'Add to Home Screen',
    body: 'Scroll the menu and tap Add to Home Screen, then tap Add.',
  },
] as const;

function SectionCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'rounded-2xl border border-white/25 bg-brand-950 p-5 text-blue-50 shadow-lg',
        className,
      )}
    >
      {children}
    </section>
  );
}

export default function InstallIosPage() {
  return (
    <div className="min-h-[100dvh] bg-brand-950 text-white">
      <div className="surface-brand min-h-[100dvh] px-4 py-10 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]">
        <div className="mx-auto max-w-lg">
          <div className="mb-8 flex flex-col items-center text-center">
            <SchoolLogo variant="dark" size={64} className="mb-4" />
            <h1 className="text-2xl font-bold tracking-tight text-white">Install on iPhone & iPad</h1>
            <p className="mt-2 text-sm text-blue-100">
              Add <strong className="font-semibold text-white">{PWA.shortName}</strong> to your Home
              Screen. There is no App Store download — this is the official school web app.
            </p>
            <p className="mt-2 text-xs text-blue-200/90">
              Requires <strong className="text-white">iOS 15 or later</strong> and Safari (not an
              in-app browser). Update iOS in Settings → General → Software Update if the app does not
              load.
            </p>
          </div>

          <div className="space-y-4">
            <SectionCard className="border-white/30 bg-white/15">
              <h2 className="mb-4 text-lg font-semibold text-white">Step-by-step</h2>
              <ol className="space-y-4">
                {INSTALL_STEPS.map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <li key={step.title} className="flex gap-3 text-sm">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm font-bold text-white">
                        {index + 1}
                      </span>
                      <div className="min-w-0 pt-0.5">
                        <p className="flex items-center gap-1.5 font-semibold text-white">
                          <Icon className="h-4 w-4 shrink-0 text-accent-400" aria-hidden />
                          {step.title}
                        </p>
                        <p className="mt-1 leading-relaxed text-blue-100">{step.body}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
              <Button asChild className="mt-5 w-full bg-white text-brand-900 hover:bg-blue-50" size="lg">
                <a href={PWA_ORIGIN} rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-5 w-5" aria-hidden />
                  Open {PWA.shortName} in Safari
                </a>
              </Button>
            </SectionCard>

            <SectionCard className="border-amber-400/40 bg-amber-950/40">
              <div className="mb-3 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 shrink-0 text-amber-300" aria-hidden />
                <h2 className="text-lg font-semibold text-white">
                  If &quot;Add to Home Screen&quot; is missing
                </h2>
              </div>
              <ul className="list-disc space-y-2.5 pl-5 text-sm leading-relaxed text-blue-50">
                <li>
                  Confirm you&apos;re in <strong className="font-semibold text-white">Safari</strong>,
                  not only an in-app browser (e.g. opened from WhatsApp).
                </li>
                <li>
                  Try opening the link in Safari: tap{' '}
                  <strong className="font-semibold text-white">⋯</strong> or the browser icon, then{' '}
                  <strong className="font-semibold text-white">Open in Safari</strong>.
                </li>
                <li>
                  Use the full URL with <strong className="font-semibold text-white">https://</strong>
                  <br />
                  <span className="mt-1 block break-all font-mono text-xs text-amber-100/90">
                    {PWA_ORIGIN}
                  </span>
                </li>
              </ul>
            </SectionCard>

            <SectionCard>
              <h2 className="mb-3 text-lg font-semibold text-white">After installing</h2>
              <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-blue-50">
                <li>Open the app from your Home Screen icon.</li>
                <li>Sign in with your school email or Quick PIN.</li>
                <li>
                  Optional: <strong className="text-white">Settings → Security → Biometric unlock</strong>{' '}
                  for Face ID, Touch ID, or fingerprint when reopening the app.
                </li>
                <li>Wi‑Fi or mobile data is required — login and live data are not fully offline.</li>
              </ul>
            </SectionCard>

            <SectionCard>
              <h2 className="mb-2 text-lg font-semibold text-white">Android phone?</h2>
              <p className="text-sm leading-relaxed text-blue-50">
                Use the official APK page instead of Safari — Chrome &quot;Install app&quot; may show
                Play Protect warnings.
              </p>
              <Button
                asChild
                className="mt-4 w-full border-2 border-white/40 bg-white/15 text-white hover:bg-white/25"
                variant="outline"
              >
                <Link href="/install-android">Install on Android</Link>
              </Button>
            </SectionCard>

            <div className="flex flex-col gap-2 border-t border-white/20 pt-4 sm:flex-row">
              <Button
                asChild
                variant="outline"
                className="min-h-11 flex-1 border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              >
                <Link href="/login">Back to login</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="min-h-11 flex-1 border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              >
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
