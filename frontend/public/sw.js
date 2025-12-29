self.addEventListener('install', (e) => {
  e.waitUntil(caches.open('qr-static-v1').then(c => c.addAll(['/','/index.html'])));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => !k.startsWith('qr-static-v1')).map(k => caches.delete(k)))));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.pathname.startsWith('/api/')) return; // network-first for API
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
