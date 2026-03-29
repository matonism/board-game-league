// Change the revision token on every production deploy (browsers only refetch when this file changes).
// rev: 1.3

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
