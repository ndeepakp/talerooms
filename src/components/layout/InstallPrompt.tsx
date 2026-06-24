"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "talerooms_install_dismissed";

// A gentle, dismissible "install Talerooms" nudge.
//  - Android/Chrome: captures the browser's beforeinstallprompt and offers a
//    one-tap Install button.
//  - iOS Safari: there's no install event, so we show the Share → Add to Home
//    Screen instruction instead.
// Never shown when already installed (standalone) or after the user dismisses it.
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [platform, setPlatform] = useState<"android" | "ios" | null>(null);

  useEffect(() => {
    // Already installed, or previously dismissed → never show.
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;
    if (standalone) return;
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      dismissed = false;
    }
    if (dismissed) return;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setPlatform("android");
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    // iOS Safari: detect and show manual instructions (no install event there).
    const ua = window.navigator.userAgent;
    const isIos = /iphone|ipad|ipod/i.test(ua);
    const isSafari = /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
    const t = isIos && isSafari ? setTimeout(() => setPlatform("ios"), 1200) : undefined;

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      if (t) clearTimeout(t);
    };
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
    setPlatform(null);
    setDeferred(null);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice.catch(() => undefined);
    dismiss();
  }

  if (!platform) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+12px)]">
      <div className="flex w-full max-w-md items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-3 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-192.png" alt="" className="h-10 w-10 rounded-lg" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Install Talerooms
          </p>
          <p className="truncate text-xs text-zinc-500">
            {platform === "ios"
              ? "Tap the Share icon, then “Add to Home Screen.”"
              : "Add it to your home screen for a full-screen app."}
          </p>
        </div>
        {platform === "android" && (
          <button
            type="button"
            onClick={install}
            className="shrink-0 rounded-full btn-primary px-4 py-1.5 text-sm font-medium"
          >
            Install
          </button>
        )}
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="shrink-0 rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
