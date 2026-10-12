"use client";

import { useState } from "react";

// Share a story: uses the native share sheet on mobile, falls back to copying
// the link to the clipboard on desktop.
export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // user cancelled or share failed — fall through to copy
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard blocked — nothing else to do
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className="inline-flex items-center gap-1.5 rounded-full border border-ui-strong px-3 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:bg-surface-soft"
    >
      <span aria-hidden="true">{copied ? "✓" : "↗"}</span>
      {copied ? "Link copied" : "Share"}
    </button>
  );
}
