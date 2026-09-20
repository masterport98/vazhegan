const CACHE = 'ganjineh-53857d0c';
const CORE = ['./', './index.html', './manifest.webmanifest',
              './icon-192.png', './icon-512.png', './icon-maskable-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(CORE); })
    .then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; })
                           .map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function isPage(req) {
  if (req.mode === 'navigate') return true;
  var p = new URL(req.url).pathname;
  return p.charAt(p.length - 1) === '/' || p.slice(-11) === '/index.html';
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  // The page itself is NETWORK-FIRST: when a new version is published it must
  // win on the very next load. The cache is the offline fallback, not the
  // default. (Cache-first here is what made phones keep serving a stale page
  // no matter how often you refreshed.)
  if (isPage(req)) {
    e.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put('./index.html', copy); })
                          .catch(function () {});
        return res;
      }).catch(function () {
        return caches.match(req).then(function (hit) {
          return hit || caches.match('./index.html');
        });
      })
    );
    return;
  }

  // Everything else — icons, fonts — is cache-first; those change rarely and
  // a new build gets a new cache name anyway.
  e.respondWith(
    caches.match(req).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); }).catch(function () {});
        return res;
      }).catch(function () { return Response.error(); });
    })
  );
});
