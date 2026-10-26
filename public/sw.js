const CACHE_NAME = 'mocaemtui-cache-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/manifest.webmanifest',
  '/icon-192x192.png',
  '/icon-512x512.png',
];

// Install Service Worker and cache essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate and clear old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch events: Network-first for pages, Cache-first for static assets
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = event.request.url;
  
  // Skip external API endpoints, stream links, or websocket connections
  if (
    url.includes('/api/') || 
    url.includes('ophim') || 
    url.includes('phimapi') || 
    url.includes('tmdb') || 
    url.includes('pusher')
  ) {
    return;
  }

  // Network-First strategy for HTML document pages
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-First strategy for static Next.js assets and images
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((response) => {
        if (
          response && 
          response.status === 200 && 
          url.startsWith(self.location.origin) &&
          (url.includes('/static/') || url.includes('/_next/') || url.endsWith('.png') || url.endsWith('.svg') || url.endsWith('.ico'))
        ) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      });
    })
  );
});

// Handle Background Push Notifications
self.addEventListener('push', (event) => {
  let data = { title: 'Mocaemtui', body: 'Có tập phim mới dành cho bạn!' };
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Mocaemtui', body: event.data.text() };
    }
  }

  const options = {
    body: data.body,
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    data: data.url || '/',
    vibrate: [100, 50, 100],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle Notification Click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = new URL(event.notification.data, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
