"use client";

import { useEffect } from "react";

// Registers the PWA service worker (public/sw.js) once, after the page loads.
// Rendered near the root so it runs on every page. Safe no-op in browsers
// without service-worker support.
export function ServiceWorker() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
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
