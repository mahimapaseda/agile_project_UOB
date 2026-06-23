import Link from 'next/link';
import { SchoolLogo } from '@/components/SchoolLogo';
import { Button } from '@/components/ui/button';
import { PWA } from '@/lib/pwa-config';

export const metadata = {
  title: `Offline — ${PWA.shortName}`,
};

export default function OfflinePage() {
  return (
    <div className="surface-brand flex min-h-dvh flex-col items-center justify-center px-6 py-12 text-center">
      <SchoolLogo variant="dark" size={72} className="mb-6" />
      <h1 className="text-xl font-bold text-white sm:text-2xl">You are offline</h1>
      <p className="mt-3 max-w-md text-sm text-blue-100">
        {PWA.shortName} needs an internet connection for login and school data. Check your
        connection, then try again.
      </p>
      <Button asChild className="mt-8" variant="secondary">
        <Link href="/">Try again</Link>
      </Button>
    </div>
  );
}
