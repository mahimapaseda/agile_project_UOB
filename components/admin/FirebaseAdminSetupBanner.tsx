'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, ExternalLink } from 'lucide-react';

interface HealthResponse {
  ok: boolean;
  onVercel?: boolean;
  source?: string | null;
  hasJson?: boolean;
  hasJsonBase64?: boolean;
  hasSplitEnv?: boolean;
  message?: string;
}

export function FirebaseAdminSetupBanner() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/health/firebase-admin', { cache: 'no-store' })
      .then(async (res) => {
        const data = (await res.json()) as HealthResponse;
        if (!cancelled) setHealth({ ...data, ok: res.ok });
      })
      .catch(() => {
        if (!cancelled) {
          setHealth({
            ok: false,
            message: 'Could not reach server health check.',
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return null;
  if (health?.ok) return null;

  const onVercel =
    typeof window !== 'undefined' &&
    (window.location.hostname.endsWith('.vercel.app') ||
      !window.location.hostname.includes('localhost'));

  return (
    <div
      role="alert"
      className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div className="min-w-0 space-y-2">
          <p className="font-semibold">Server login API is not configured on this deployment</p>
          <p className="text-amber-900/90">
            Create / edit user and Quick PIN need Firebase Admin credentials on the host.
            {health?.message ? ` ${health.message}` : null}
          </p>
          {onVercel ? (
            <ol className="list-decimal space-y-1 pl-4 text-amber-900/90">
              <li>
                On your PC, in the project folder, run:{' '}
                <code className="rounded bg-amber-100 px-1">npm run prepare-vercel-env</code>
              </li>
              <li>
                Vercel → Project → <strong>Settings</strong> → <strong>Environment Variables</strong>
              </li>
              <li>
                Add <code className="rounded bg-amber-100 px-1">FIREBASE_SERVICE_ACCOUNT_JSON_BASE64</code>{' '}
                = entire contents of{' '}
                <code className="rounded bg-amber-100 px-1">.vercel-FIREBASE_SERVICE_ACCOUNT_JSON_BASE64.txt</code>
              </li>
              <li>
                Enable for <strong>Production</strong> and <strong>Preview</strong>, then{' '}
                <strong>Redeploy</strong>
              </li>
              <li>
                Verify:{' '}
                <a
                  href="/api/health/firebase-admin"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-amber-800 underline"
                >
                  /api/health/firebase-admin
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>{' '}
                should show <code className="rounded bg-amber-100 px-1">{`"ok":true`}</code>
              </li>
            </ol>
          ) : (
            <p className="text-amber-900/90">
              Locally: set <code className="rounded bg-amber-100 px-1">FIREBASE_SERVICE_ACCOUNT_PATH</code> in{' '}
              <code className="rounded bg-amber-100 px-1">.env.local</code> and restart{' '}
              <code className="rounded bg-amber-100 px-1">npm run dev</code>.
            </p>
          )}
          {health && !health.ok && (health.hasJson || health.hasJsonBase64 || health.hasSplitEnv) ? (
            <p className="flex items-center gap-2 text-amber-800">
              <CheckCircle2 className="h-4 w-4" />
              Env var name detected but invalid — re-paste from{' '}
              <code className="rounded bg-amber-100 px-1">npm run prepare-vercel-env</code> and redeploy.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
