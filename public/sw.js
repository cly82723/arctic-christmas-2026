// Offline support: the app shell is cached on install and refreshed in the background; map tiles are cached as you view them.
// Trip data itself is cached by Firestore (IndexedDB), not here.
const SHELL = 'shell-v1';
const TILES = 'tiles-v1';
const FILES = ['/', '/index.html', '/app.js', '/app.css', '/leaflet.css', '/manifest.webmanifest', '/apple-touch-icon.png', '/icon-192.png'];

self.addEventListener('install', (e) => { e.waitUntil(caches.open(SHELL).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => ![SHELL, TILES].includes(k)).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });

self.addEventListener('fetch', (e) => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname === 'tile.openstreetmap.org') {
    e.respondWith(caches.open(TILES).then(async (c) => { const hit = await c.match(req); if (hit) return hit; try { const res = await fetch(req); if (res.ok) c.put(req, res.clone()); return res; } catch { return hit || Response.error(); } }));
    return;
  }
  if (url.origin !== location.origin || url.pathname === '/__content.json') return;
  e.respondWith(caches.open(SHELL).then(async (c) => {
    const hit = await c.match(req, { ignoreSearch: true }) || (req.mode === 'navigate' ? await c.match('/index.html') : null);
    const net = fetch(req).then((res) => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  }));
});
