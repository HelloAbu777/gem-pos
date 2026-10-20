// GEM POS Service Worker
const CACHE_NAME = 'gem-pos-v1';

// Offline uchun cache qilinadigan statik fayllar
const STATIC_ASSETS = [
  '/',
  '/login',
  '/offline',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Ba'zi URL'lar yuklanmasa ham o'rnatish davom etsin
        return Promise.resolve();
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API so'rovlarini cache qilmaymiz — har doim network
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({ error: 'Internet aloqasi yo\'q' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  // Statik fayllar: cache-first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      }).catch(() => {
        // Offline bo'lsa /offline sahifasini ko'rsat
        if (request.mode === 'navigate') {
          return caches.match('/offline') || new Response('Offline', { status: 503 });
        }
        return new Response('', { status: 503 });
      });
    })
  );
});
