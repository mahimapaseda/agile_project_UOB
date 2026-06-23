/* Delta Gemunupura College DBMS — service worker (static shell + offline fallback) */
const CACHE_VERSION = 'dgc-dbms-v2';
const STATIC_CACHE = `static-${CACHE_VERSION}`;

const PRECACHE_URLS = ['/offline', '/icons/icon-192.png', '/icons/icon-512.png'];

function isApiRequest(url) {
  return url.pathname.startsWith('/api/');
}

function isFirebaseRequest(url) {
  const host = url.hostname;
  return (
    host.includes('googleapis.com') ||
    host.includes('firebaseio.com') ||
    host.includes('firebaseapp.com') ||
    host.includes('firebasestorage.googleapis.com')
  );
}

function isStaticAsset(pathname) {
  return (
    pathname.startsWith('/_next/static/') ||
    /\.(?:js|css|woff2?|png|jpg|jpeg|svg|ico|webp)$/i.test(pathname)
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== STATIC_CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isApiRequest(url) || isFirebaseRequest(url)) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached || caches.match('/offline');
        }),
    );
    return;
  }

  if (isStaticAsset(url.pathname)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
  }
});
