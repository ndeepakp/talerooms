"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signOut } from "@/lib/auth-client";

export function NavMenu({ profileHref }: { profileHref: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref} onKeyDown={(e) => {
      if (e.key === "Escape") {
        setOpen(false);
        ref.current?.querySelector<HTMLButtonElement>("button")?.focus();
      }
    }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Menu"
        aria-expanded={open}
        className="flex h-11 w-11 items-center justify-center rounded-full border border-ui-strong text-ink transition-colors hover:bg-surface-soft"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true" className="h-5 w-5"><path d="M5 6h14M5 12h14M5 18h14" /></svg>
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-xl border border-ui bg-surface-raised py-1 shadow-lg">
          <Link href={profileHref} onClick={() => setOpen(false)} className="block px-4 py-2.5 text-sm text-ink-soft hover:bg-surface-soft">Profile</Link>
          <Link
            href="/library"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-sm text-ink-soft hover:bg-surface-soft"
          >
            Library
          </Link>
          <Link
            href="/collections"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-sm text-ink-soft hover:bg-surface-soft"
          >
            Collections
          </Link>
          <Link
            href="/drafts"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-sm text-ink-soft hover:bg-surface-soft"
          >
            Drafts
          </Link>
          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-sm text-ink-soft hover:bg-surface-soft"
          >
            Settings
          </Link>
          <button
            type="button"
            onClick={async () => {
              setOpen(false);
              await signOut();
              router.push("/login");
              router.refresh();
            }}
            className="block w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-surface-soft dark:text-red-400"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
