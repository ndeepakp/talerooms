"use client";

import { useEffect, useState } from "react";

// VAPID public key → the Uint8Array the PushManager wants.
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

// Lets the signed-in user turn browser push notifications on/off for this
// device (subscribes via the service worker and stores the subscription).
export function PushToggle() {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ok =
        typeof window !== "undefined" &&
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window;
      if (cancelled) return;
      setSupported(ok);
      if (!ok) return;
      setDenied(Notification.permission === "denied");
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (!cancelled) setEnabled(!!sub);
      } catch {
        // ignore — leave as not subscribed
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function enable() {
    setBusy(true);
    setError(null);
    try {
      const perm = await Notification.requestPermission();
      if (perm === "denied") {
        setDenied(true);
        throw new Error("denied");
      }
      if (perm !== "granted") throw new Error("dismissed");

      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!key) throw new Error("unconfigured");

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key) as BufferSource,
      });
      const res = await fetch("/api/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub),
      });
      if (!res.ok) throw new Error("save");
      setEnabled(true);
    } catch (e) {
      const m = (e as Error).message;
      setError(
        m === "denied"
          ? "Notifications are blocked. Enable them for this site in your browser settings."
          : m === "unconfigured"
            ? "Push isn't configured on this server yet."
            : "Couldn't enable notifications. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setError(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        }).catch(() => {});
        await sub.unsubscribe().catch(() => {});
      }
      setEnabled(false);
    } catch {
      setError("Couldn't turn notifications off.");
    } finally {
      setBusy(false);
    }
  }

  if (supported === false) {
    return (
      <p className="rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-500 dark:bg-zinc-900/40">
        Push notifications aren&apos;t supported in this browser. On iPhone, add
        Talerooms to your Home Screen first, then open it from there.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
        <div>
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            New-chapter & activity alerts
          </p>
          <p className="text-xs text-zinc-500">
            {enabled
              ? "On for this device — you'll get a push when something happens."
              : "Get pushed when an author you follow drops a new chapter, and more."}
          </p>
        </div>
        <button
          type="button"
          onClick={enabled ? disable : enable}
          disabled={busy || (denied && !enabled)}
          className={
            "shrink-0 rounded-full px-4 py-2 text-sm font-medium disabled:opacity-50 " +
            (enabled
              ? "border border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
              : "btn-primary")
          }
        >
          {busy ? "…" : enabled ? "Turn off" : "Turn on"}
        </button>
      </div>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
