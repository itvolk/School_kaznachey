// sw.js
const CACHE_NAME = 'treasurer-cache-v2';
const urlsToCache = [
  '.',
  'index.html',
  'manifest.json',
  'data/parents.json'
];

// Устанавливаем кэш
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('✅ Кэш казначея открыт');
        return cache.addAll(urlsToCache);
      })
      .then(function() {
        return self.skipWaiting();
      })
  );
});

// Активация - удаляем старые кэши
self.addEventListener('activate', function(event) {
  event.waitUntil(
    Promise.all([
      caches.keys().then(function(cacheNames) {
        return Promise.all(
          cacheNames.map(function(cacheName) {
            if (cacheName !== CACHE_NAME) {
              console.log('🗑️ Удаляем старый кэш:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      self.clients.claim()
    ])
  );
});

// Стратегия загрузки
self.addEventListener('fetch', function(event) {
  const request = event.request;
  const url = new URL(request.url);
  
  // Для HTML-страниц - проверяем обновления
  if (url.pathname === '/' || url.pathname === '/index.html' || url.pathname === '') {
    event.respondWith(
      fetch(request, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      })
      .then(function(response) {
        if (response && response.ok) {
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(request, response.clone());
          });
        }
        return response;
      })
      .catch(function() {
        return caches.match(request);
      })
    );
    return;
  }
  
  // Для остальных - сначала кэш, потом сеть
  event.respondWith(
    caches.match(request)
      .then(function(response) {
        if (response) {
          // Фоновое обновление для статики
          if (request.url.match(/\.(css|js|png|jpg|jpeg|svg|ico)$/i)) {
            fetch(request)
              .then(function(fetchResponse) {
                if (fetchResponse && fetchResponse.ok) {
                  caches.open(CACHE_NAME).then(function(cache) {
                    cache.put(request, fetchResponse);
                  });
                }
              })
              .catch(function() {});
          }
          return response;
        }
        
        return fetch(request)
          .then(function(fetchResponse) {
            if (fetchResponse && fetchResponse.ok) {
              caches.open(CACHE_NAME).then(function(cache) {
                cache.put(request, fetchResponse.clone());
              });
            }
            return fetchResponse;
          });
      })
  );
});

self.addEventListener('message', function(event) {
  if (event.data === 'checkForUpdate') {
    self.skipWaiting();
  }
});