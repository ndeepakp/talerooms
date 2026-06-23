// Talerooms service worker. Phase 1: makes the app installable + gives a graceful
// offline experience. It deliberately does NOT cache authenticated HTML — page
// navigations are always network-first, falling back to a simple offline screen
// only when the device is truly offline. Only immutable assets are cached.
// (Push-notification handlers will be added in Phase 2.)

const CACHE = "talerooms-v1";

const OFFLINE_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Offline · Talerooms</title>
<style>
  html,body{height:100%;margin:0}
  body{display:flex;align-items:center;justify-content:center;background:#111;color:#e5e5e5;
       font-family:system-ui,-apple-system,sans-serif;text-align:center;padding:24px}
  .box{max-width:320px}
  h1{font-size:20px;margin:0 0 8px}
  p{color:#a3a3a3;font-size:14px;line-height:1.5;margin:0 0 16px}
  button{background:#fff;color:#111;border:0;border-radius:999px;padding:10px 18px;
         font-size:14px;font-weight:600;cursor:pointer}
</style></head><body><div class="box">
  <h1>You're offline</h1>
  <p>Talerooms needs a connection to load new pages. Reconnect and try again.</p>
  <button onclick="location.reload()">Retry</button>
</div></body></html>`;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // don't touch cross-origin

  // Page navigations: always go to the network; only show the offline screen
  // when the network is unreachable. Never serve a cached authenticated page.
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return await fetch(req);
        } catch {
          return new Response(OFFLINE_HTML, {
            headers: { "Content-Type": "text/html; charset=utf-8" },
          });
        }
      })(),
    );
    return;
  }

  // Immutable static assets (content-hashed build files + app icons): cache-first.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        const res = await fetch(req);
        if (res.ok) {
          const cache = await caches.open(CACHE);
          cache.put(req, res.clone());
        }
        return res;
      })(),
    );
  }
});

// --- Push notifications ---

// A push arrived from the server: show a notification.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  const title = data.title || "Talerooms";
  const options = {
    body: data.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: data.tag || undefined,
    data: { url: data.url || "/feed" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Tapping a notification focuses an existing tab (navigating it) or opens one.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/feed";
  event.waitUntil(
    (async () => {
      const clientsList = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of clientsList) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) {
            try {
              await client.navigate(target);
            } catch {
              // ignore — cross-origin or detached
            }
          }
          return;
        }
      }
      await self.clients.openWindow(target);
    })(),
  );
});
