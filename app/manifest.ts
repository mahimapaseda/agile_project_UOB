import type { MetadataRoute } from 'next';
import { PWA, PWA_ORIENTATION } from '@/lib/pwa-config';

export default function manifest(): MetadataRoute.Manifest {
  return {
    // Extended fields (handle_links, launch_handler) are valid in the web manifest but
    // not yet in Next.js MetadataRoute.Manifest types — included for Android/Chrome.
    id: PWA.id,
    name: PWA.name,
    short_name: PWA.shortName,
    description: PWA.description,
    start_url: PWA.startUrl,
    scope: PWA.scope,
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui', 'browser'],
    orientation: PWA_ORIENTATION,
    theme_color: PWA.themeColor,
    background_color: PWA.backgroundColor,
    categories: ['education', 'productivity'],
    lang: 'en',
    dir: 'ltr',
    prefer_related_applications: false,
    handle_links: 'preferred',
    launch_handler: {
      client_mode: ['navigate-existing', 'auto'],
    },
    icons: [
      {
        src: '/school-logo.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-maskable-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Dashboard',
        short_name: 'Home',
        url: '/dashboard?source=pwa-shortcut',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
      {
        name: 'Sign in',
        short_name: 'Login',
        url: '/login?source=pwa-shortcut',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
    ],
    related_applications: [],
  } as unknown as MetadataRoute.Manifest;
}
