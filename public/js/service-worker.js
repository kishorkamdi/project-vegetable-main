const CACHE_NAME = 'veggie-shop-cache-v1';
const urlsToCache = [
  '/',
  '/products',
  '/css/style.css',
  '/css/landing-cards.css',
  '/js/dark-mode-toggle.js',
  '/images/logo-png.png',
  // Add other assets and pages as needed
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});
