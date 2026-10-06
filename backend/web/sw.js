// Minimal service worker: makes the app installable. Always goes to the network, so updates show immediately.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))
self.addEventListener('fetch', () => {})
