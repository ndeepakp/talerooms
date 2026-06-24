"use client";

import { useEffect } from "react";

// Manages the PWA service worker (public/sw.js).
//
// In PRODUCTION: registers it once after load (offline support + push).
// In DEVELOPMENT: does the opposite — unregisters any existing service worker
// and clears its caches. A service worker in front of the dev server caches
// assets and serves stale pages, which makes code changes appear not to take
// effect. Keeping it production-only avoids that whole class of confusion and
// self-heals browsers that registered it earlier.
export function ServiceWorker() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      // Tear down any previously-registered worker + its caches.
      navigator.serviceWorker.getRegistrations?.().then((regs) => {
        regs.forEach((r) => r.unregister());
      });
      if (typeof caches !== "undefined") {
        caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
      }
      return;
    }

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Registration failures are non-fatal — the site works without it.
      });
    };
    if (document.readyState === "complete") register();
    else {
      window.addEventListener("load", register);
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
