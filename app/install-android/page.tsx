import Link from 'next/link';
import { SchoolLogo } from '@/components/SchoolLogo';
import { Button } from '@/components/ui/button';
import {
  ANDROID_APK_URL,
  PWA,
  PWA_BUILDER_ANDROID_URL,
} from '@/lib/pwa-config';
import { Download, ShieldCheck, Smartphone } from 'lucide-react';

export const metadata = {
  title: `Install on Android`,
  description: `Install ${PWA.shortName} on Android without Play Protect warnings`,
};

export default function InstallAndroidPage() {
  return (
    <div className="surface-brand min-h-dvh px-4 py-10 text-white">
      <div className="mx-auto max-w-lg">
        <div className="mb-8 flex flex-col items-center text-center">
          <SchoolLogo variant="dark" size={64} className="mb-4" />
          <h1 className="text-2xl font-bold tracking-tight">Install on Android</h1>
          <p className="mt-2 text-sm text-blue-100">
            Avoid the Play Protect &quot;unsafe / older Android&quot; warning by using the official
            school APK (Android 14+).
          </p>
        </div>

        <div className="space-y-4">
          <section className="rounded-2xl bg-brand-800 p-5 ring-1 ring-white/20">
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-accent-400" aria-hidden />
              <h2 className="font-semibold">Recommended — Official APK</h2>
            </div>
            <p className="mb-4 text-sm text-blue-100">
              Built with <strong className="text-white">targetSdk 35</strong> for current Android
              privacy checks. No Play Protect block.
            </p>
            <Button asChild className="w-full" size="lg">
              <a href={ANDROID_APK_URL} download>
                <Download className="mr-2 h-5 w-5" aria-hidden />
                Download Delta DBMS APK
              </a>
            </Button>
            <p className="mt-3 text-xs text-blue-200/90">
              After download: open the file → Install → Allow from this source if asked. If the file
              is missing, ask IT to run the <strong>Build Android APK</strong> workflow on GitHub.
            </p>
          </section>

          <section className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
            <div className="mb-3 flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-blue-200" aria-hidden />
              <h2 className="font-semibold">Why Chrome &quot;Install app&quot; shows a warning</h2>
            </div>
            <p className="text-sm text-blue-100">
              Chrome creates a temporary <strong className="text-white">WebAPK</strong> package.
              Play Protect often flags it as &quot;built for an older Android version&quot; even for
              safe school sites. That is a false alarm — but the official APK above avoids it
              entirely.
            </p>
          </section>

          <section className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10 text-sm text-blue-100">
            <h2 className="mb-2 font-semibold text-white">Still using Chrome install?</h2>
            <ol className="list-decimal space-y-1.5 pl-5">
              <li>Uninstall any old Delta DBMS icon first.</li>
              <li>When Play Protect appears, tap <strong className="text-white">Install anyway</strong>.</li>
              <li>This is your school&apos;s site at {PWA.origin} — not a random app store download.</li>
            </ol>
          </section>

          <section className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10 text-sm">
            <h2 className="mb-2 font-semibold">IT: Build APK on GitHub</h2>
            <p className="text-blue-100">
              Repository → Actions → <strong className="text-white">Build Android APK</strong> → Run
              workflow. Set secret <code className="rounded bg-white/10 px-1">ANDROID_KEYSTORE_PASSWORD</code>{' '}
              first. APK is published to <code className="rounded bg-white/10 px-1">/downloads/dgc-dbms.apk</code>.
            </p>
            <Button asChild variant="secondary" className="mt-3 w-full">
              <a href={PWA_BUILDER_ANDROID_URL} target="_blank" rel="noopener noreferrer">
                Or build with PWABuilder
              </a>
            </Button>
          </section>

          <Button asChild variant="ghost" className="w-full text-blue-100 hover:bg-white/10 hover:text-white">
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
