const CACHE_NAME = "coffre-cache-v1";
const FILES_TO_CACHE = [
  "index.html",
  "style.css",
  "app.js",
  "crypto.js",
  "manifest.json",
  "icon-192.png",
  "icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE))
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => key !== CACHE_NAME && caches.delete(key))
      )
    )
  );
});

self.addEventListener("fetch", event => {
  const url = event.request.url;

  // Ne jamais mettre en cache les fichiers .dat
  if (url.endsWith(".dat")) return;

  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
