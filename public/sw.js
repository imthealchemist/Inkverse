/* SOLID INK NOVEL — service worker (PWA + offline support) */
const VERSION = 'solidink-v1';
const API_CACHE = VERSION + '-api';
const SHELL = ['/', '/index.html', '/css/styles.css', '/js/app.js', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSION)
      .then(c => c.addAll(SHELL))
      .catch(() => {}) // never block install on a missing asset
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== API_CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return; // never intercept writes
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // API reads: network-first, fall back to the last cached response offline
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(
      fetch(req)
        .then(r => { if (r.ok) { const cp = r.clone(); caches.open(API_CACHE).then(c => c.put(req, cp)); } return r; })
        .catch(() => caches.match(req))
    );
    return;
  }

  // App shell (HTML/JS/CSS): network-first so deploys show up immediately
  if (req.mode === 'navigate' || url.pathname.startsWith('/js/') || url.pathname.startsWith('/css/')) {
    e.respondWith(
      fetch(req)
        .then(r => { const cp = r.clone(); caches.open(VERSION).then(c => c.put(req, cp)); return r; })
        .catch(() => caches.match(req).then(hit => hit || caches.match('/index.html')))
    );
    return;
  }

  // Static assets (covers, icons, manifest): cache-first with background fill
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(r => {
      if (r.ok) { const cp = r.clone(); caches.open(VERSION).then(c => c.put(req, cp)); }
      return r;
    }))
  );
});
