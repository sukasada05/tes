// sw.js - Service Worker untuk DUKOPS
const CACHE_NAME = 'dukops-v1';
const urlsToCache = [
    'index.html',
    'css/main.css',
    'icons/favicon-96x96.png',
    'icons/favicon.svg',
    'site.webmanifest',
    'LOGO KOREM163 Wirasatya.png'
];

// Install Service Worker
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('📦 Caching DUKOPS assets...');
                return cache.addAll(urlsToCache);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate Service Worker
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('🗑️ Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch dari cache jika offline
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Cache hit - return response
                if (response) {
                    return response;
                }
                // Clone request karena fetch hanya bisa dipakai sekali
                const fetchRequest = event.request.clone();
                return fetch(fetchRequest).then(
                    response => {
                        // Cek response valid
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        // Clone response karena response hanya bisa dipakai sekali
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });
                        return response;
                    }
                );
            })
            .catch(() => {
                // Fallback offline
                return new Response(`
                    <html>
                        <head><title>DUKOPS Offline</title></head>
                        <body>
                            <h1>📱 DUKOPS BABINSA</h1>
                            <p>Anda sedang offline. Silakan cek koneksi internet.</p>
                            <p><a href="./">Coba lagi</a></p>
                        </body>
                    </html>
                `, {
                    status: 200,
                    headers: { 'Content-Type': 'text/html' }
                });
            })
    );
});