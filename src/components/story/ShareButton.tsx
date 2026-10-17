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
      className="story-toolbar-button"
    >
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        {copied ? <path d="m5 12 4 4L19 6" /> : <><path d="M12 16V3m-4 4 4-4 4 4" /><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" /></>}
      </svg>
      {copied ? "Link copied" : "Share"}
    </button>
  );
}
