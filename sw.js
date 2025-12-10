const CACHE_NAME = 'universalstream-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Instalación: Cachear archivos estáticos críticos
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Activación: Limpiar cachés antiguas para asegurar actualizaciones
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch: Estrategia Network-First con Fallback a Caché
// Esto asegura que si hay internet, se usa la versión más reciente. Si no, la caché.
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Si la respuesta es válida, la clonamos a la caché (opcional, para uso futuro)
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME)
          .then(cache => {
            // No cacheamos peticiones POST o extensiones de chrome
            if (event.request.method === 'GET' && !event.request.url.startsWith('chrome-extension')) {
               cache.put(event.request, responseToCache);
            }
          });
        return response;
      })
      .catch(() => {
        // Si falla la red, intentamos servir desde la caché
        return caches.match(event.request);
      })
  );
});