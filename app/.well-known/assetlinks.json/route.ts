import { NextResponse } from 'next/server';
import { ANDROID_PACKAGE_ID } from '@/lib/pwa-config';

/**
 * Digital Asset Links for Android TWA (Trusted Web Activity).
 * Set ANDROID_SHA256_FINGERPRINTS (comma-separated) in Vercel after building the APK.
 */
export async function GET() {
  const raw = process.env.ANDROID_SHA256_FINGERPRINTS?.trim();
  if (!raw) {
    return NextResponse.json([], {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const fingerprints = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const statements = fingerprints.map((sha256_cert_fingerprints) => ({
    relation: ['delegate_permission/common.handle_all_urls'],
    target: {
      namespace: 'android_app',
      package_name: ANDROID_PACKAGE_ID,
      sha256_cert_fingerprints: [sha256_cert_fingerprints],
    },
  }));

  return NextResponse.json(statements, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
