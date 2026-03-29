// Bump the revision comment in sw.js on each deploy so clients pick up updates.
// PWA caches are aggressive; changing sw.js is the standard way to force a refresh.

if ('serviceWorker' in navigator) {
  let reloadAfterControllerChange = false;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!reloadAfterControllerChange) return;
    reloadAfterControllerChange = false;
    window.location.reload();
  });

  navigator.serviceWorker
    .register('/sw.js', { scope: '/', updateViaCache: 'none' })
    .then((registration) => {
      registration.addEventListener('updatefound', () => {
        // Only auto-reload when replacing an existing worker (not first install).
        if (navigator.serviceWorker.controller) {
          reloadAfterControllerChange = true;
        }
      });

      const pingUpdate = () => registration.update();
      pingUpdate();
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') pingUpdate();
      });
      window.addEventListener('pageshow', (event) => {
        if (event.persisted) pingUpdate();
      });
    })
    .catch(() => {});
}
