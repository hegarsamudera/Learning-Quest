/**
 * sw.js — offline support.
 *
 * Strategy:
 *   - App shell (HTML/CSS/JS): cache-first, so the game boots instantly
 *     and works with zero network. Bump CACHE_VERSION whenever any of
 *     these files change so old clients pick up the update.
 *   - data/*.json (game content): stale-while-revalidate, so a returning
 *     player sees cached questions instantly, while a fresh copy is
 *     fetched in the background for next time (kids replay games often;
 *     data can change between visits when new questions are added).
 */
const CACHE_VERSION = 'learning-quest-v2';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './css/tokens.css',
  './css/base.css',
  './css/components.css',
  './css/screens.css',
  './css/games/math.css',
  './css/games/coding.css',
  './css/games/science.css',
  './css/utilities.css',
  './js/main.js',
  './js/installPrompt.js',
  './js/notifications.js',
  './js/state.js',
  './js/router.js',
  './js/renderer.js',
  './js/storage.js',
  './js/audio.js',
  './js/gamification.js',
  './js/utils.js',
  './js/dataLoader.js',
  './js/components/Toast.js',
  './js/components/Modal.js',
  './js/components/SparkleBubble.js',
  './data/games.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const isDataRequest = (url) => url.pathname.includes('/data/') && url.pathname.endsWith('.json');

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return; // don't intercept cross-origin requests

  if (isDataRequest(url)) {
    event.respondWith(staleWhileRevalidate(event.request));
    return;
  }
  event.respondWith(cacheFirst(event.request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const fresh = await fetch(request);
    const cache = await caches.open(CACHE_VERSION);
    cache.put(request, fresh.clone());
    return fresh;
  } catch (err) {
    // Offline and not cached — fall back to the app shell so navigations
    // still render something instead of a browser error page.
    return caches.match('./index.html');
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then((response) => { cache.put(request, response.clone()); return response; })
    .catch(() => null);
  return cached || (await networkPromise) || new Response('{}', { headers: { 'Content-Type': 'application/json' } });
}

// ----------------------------------------------------------------------
// V4 PUSH ARCHITECTURE SEAM
// ----------------------------------------------------------------------
// This app has no backend, so nothing ever calls pushManager.subscribe()
// today and no server ever sends a push message — this listener is
// currently unreachable in production. It's included so the *shape* of
// the V4 migration is concrete: a PushProvider (see notifications.js's
// docblock) would subscribe the browser to a push service, send that
// subscription to a small backend, and the backend's push messages
// would land here exactly like this, still ending up as a plain
// `self.registration.showNotification(...)` call — the same underlying
// primitive `Notifications.show()` already wraps client-side. No call
// site anywhere else in the app needs to change for V4 to work.
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload;
  try { payload = event.data.json(); } catch { payload = { title: 'Learning Quest', body: event.data.text() }; }
  event.waitUntil(
    self.registration.showNotification(payload.title || 'Sparkle', {
      body: payload.body || '',
      tag: 'learning-quest',
      icon: './icons/icon-192.png',
    }),
  );
});

// Tapping *any* notification (local, via the Notification constructor
// today, or a future real push notification) should bring an existing
// tab to the foreground rather than opening a duplicate one.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const existing = clientList.find((c) => 'focus' in c);
      if (existing) return existing.focus();
      return self.clients.openWindow('./index.html');
    }),
  );
});
