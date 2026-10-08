"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  NotificationMessage,
  type Notification,
} from "@/components/notifications/NotificationMessage";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [total, setTotal] = useState(0);
  const [loaded, setLoaded] = useState(false);
  // Local override: once opened, the badge clears even before the next fetch.
  const [cleared, setCleared] = useState(false);
  const [reload, setReload] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  // Fetch on mount and whenever refreshed. no-store so a brand-new event isn't
  // hidden by a stale cached response.
  useEffect(() => {
    let active = true;
    (async () => {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!active) return;
      if (res.ok) {
        const data = await res.json();
        setItems(data.items as Notification[]);
        setUnread(data.unread as number);
        setTotal(data.total as number);
        setCleared(false);
      }
      setLoaded(true);
    })();
    return () => {
      active = false;
    };
  }, [reload]);

  // Refresh whenever the user comes back to this tab/window.
  useEffect(() => {
    const onFocus = () => setReload((r) => r + 1);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Opening the bell marks unread notifications as read (clears the badge); the
  // items stay listed.
  function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next && unread > 0 && !cleared) {
      setCleared(true);
      fetch("/api/notifications/seen", { method: "POST" });
    }
  }

  const badge = cleared ? 0 : unread;

  return (
    <div className="relative" ref={ref} onKeyDown={event => {
      if (event.key === "Escape") {
        setOpen(false);
        ref.current?.querySelector<HTMLButtonElement>("button")?.focus();
      }
    }}>
      <button
        type="button"
        onClick={toggleOpen}
        aria-label="Notifications"
        aria-expanded={open}
        className="relative flex h-11 w-11 items-center justify-center rounded-full border border-ui-strong text-ink transition-colors hover:bg-surface-soft"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="h-5 w-5"
        >
          <path d="M10.268 21a2 2 0 0 0 3.464 0" />
          <path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326" />
        </svg>
        {loaded && badge > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-xs font-semibold text-accent-fg">
            {badge}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-x-4 top-[68px] z-50 max-h-[calc(100dvh-84px)] overflow-y-auto rounded-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80 border border-ui bg-surface-raised shadow-lg">
          <div className="flex items-center justify-between border-b border-ui px-4 py-2.5">
            <span className="text-sm font-semibold text-ink">
              Notifications
            </span>
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-accent hover:underline"
            >
              View all
            </Link>
          </div>

          {!loaded ? (
            <p className="px-4 py-6 text-center text-sm text-muted">Loading…</p>
          ) : items.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted">
              No notifications yet.
            </p>
          ) : (
            <ul className="max-h-96 overflow-y-auto py-1">
              {items.map((n) => (
                <li
                  key={n.id}
                  className={
                    "flex gap-2 px-4 py-3 " +
                    (n.seen
                      ? "bg-surface-raised"
                      : "bg-zinc-100 dark:bg-zinc-800/50")
                  }
                >
                  <span
                    aria-hidden="true"
                    className={
                      "mt-1.5 h-2 w-2 shrink-0 rounded-full " +
                      (n.seen ? "bg-transparent" : "bg-accent")
                    }
                  />
                  <p className="min-w-0 break-words text-sm text-ink-soft">
                    <NotificationMessage n={n} />
                  </p>
                </li>
              ))}
            </ul>
          )}

          {loaded && total > 0 && (
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="block border-t border-ui px-4 py-2.5 text-center text-sm font-medium text-accent hover:bg-surface-soft"
            >
              View all notifications{total > items.length ? ` (${total})` : ""}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
