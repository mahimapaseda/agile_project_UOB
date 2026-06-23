/** Shared PWA branding (manifest, metadata, install UI). */
export const PWA_ORIGIN =
  process.env.NEXT_PUBLIC_PWA_ORIGIN?.replace(/\/$/, '') || 'https://dgmvdbms.vercel.app';

/** Bump when Android must mint a fresh WebAPK (after Play Protect / SDK issues). */
export const PWA_MANIFEST_VERSION = '5';

/** Lock installed app to portrait (matches typical phone “portrait only” setting). */
export const PWA_ORIENTATION = 'portrait-primary' as const;

export const PWA = {
  name: 'Delta Gemunupura College DBMS',
  shortName: 'Delta DBMS',
  description: 'School database management for Delta Gemunupura College',
  themeColor: '#1e3a8a',
  backgroundColor: '#f1f5f9',
  /** Stable PWA identity for Chrome/Android (must not change casually). */
  id: `${PWA_ORIGIN}/?pwaId=dbms`,
  scope: '/',
  startUrl: `/?source=pwa&v=${PWA_MANIFEST_VERSION}`,
  origin: PWA_ORIGIN,
} as const;

/** School emblem used for PWA / launcher icons (same as SchoolLogo). */
export const PWA_ICON_LOGO_PATH = '/school-logo.png';

/** Android TWA package id (Trusted Web Activity APK — API 34+). */
export const ANDROID_PACKAGE_ID = 'lk.deltagemunupura.dbms';

/** Signed APK (targetSdk 35). Set after CI build or host at /downloads/dgc-dbms.apk */
export const ANDROID_APK_URL =
  process.env.NEXT_PUBLIC_ANDROID_APK_URL?.trim() || '/downloads/dgc-dbms.apk';

/** PWABuilder — build APK in browser if CI artifact is not ready yet */
export const PWA_BUILDER_ANDROID_URL =
  'https://www.pwabuilder.com/reportcard?site=https://dgmvdbms.vercel.app';
