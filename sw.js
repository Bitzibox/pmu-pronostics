/**
 * Service Worker pour PMU Pronostics
 * Gère le cache et le mode offline
 */

const CACHE_NAME = 'pmu-pronostics-v1';
const OFFLINE_URL = '/index.html';

// Fichiers à mettre en cache
const CACHE_FILES = [
    '/',
    '/index.html',
    '/css/styles.css',
    '/js/app.js',
    '/manifest.json'
];

// Installation du Service Worker
self.addEventListener('install', (event) => {
    console.log('[SW] Installation...');

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Mise en cache des fichiers');
                return cache.addAll(CACHE_FILES);
            })
            .then(() => self.skipWaiting())
    );
});

// Activation du Service Worker
self.addEventListener('activate', (event) => {
    console.log('[SW] Activation...');

    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[SW] Suppression ancien cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Stratégie de cache: Network First avec fallback sur cache
self.addEventListener('fetch', (event) => {
    // Ignorer les requêtes non-GET
    if (event.request.method !== 'GET') return;

    // Ignorer les requêtes vers GitHub raw
    if (event.request.url.includes('raw.githubusercontent.com')) {
        return; // Laisser passer sans cache
    }

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Cloner la réponse car elle ne peut être consommée qu'une fois
                const responseClone = response.clone();

                // Mettre à jour le cache avec la nouvelle réponse
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseClone);
                });

                return response;
            })
            .catch(() => {
                // En cas d'échec réseau, chercher dans le cache
                return caches.match(event.request)
                    .then((cachedResponse) => {
                        if (cachedResponse) {
                            console.log('[SW] Servir depuis cache:', event.request.url);
                            return cachedResponse;
                        }

                        // Si pas en cache et c'est une navigation, retourner la page offline
                        if (event.request.mode === 'navigate') {
                            return caches.match(OFFLINE_URL);
                        }
                    });
            })
    );
});

// Gestion des messages depuis l'application
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data && event.data.type === 'CLEAR_CACHE') {
        event.waitUntil(
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => caches.delete(cacheName))
                );
            }).then(() => {
                event.ports[0].postMessage({ success: true });
            })
        );
    }
});
