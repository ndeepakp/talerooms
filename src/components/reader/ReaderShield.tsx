"use client";

import { useEffect, useRef, useState } from "react";

// Best-effort screenshot deterrent for the story reader. The browser is never
// told about most screenshot gestures (Cmd+Shift+4, a phone's capture, etc.),
// so this only reacts to the weak signals it CAN see — the PrintScreen key, the
// window losing focus, or the tab being hidden — by snapping the reader to a
// black screen, then revealing again on return. Leak traceability is handled
// separately by the per-reader attribution line in each page's footer.
export function ReaderShield() {
  const [blanked, setBlanked] = useState(false);
  // A short hold so a momentary blur (e.g. clicking the snip tool) doesn't flash
  // the content back the instant focus returns mid-capture.
  const holdUntil = useRef(0);

  useEffect(() => {
    const blank = (holdMs = 0) => {
      holdUntil.current = Math.max(holdUntil.current, Date.now() + holdMs);
      setBlanked(true);
    };
    const reveal = () => {
      if (Date.now() < holdUntil.current) return;
      setBlanked(false);
    };

    const onKey = (e: KeyboardEvent) => {
      // PrintScreen, or a Cmd/Win+Shift combo (macOS / Windows snip shortcuts).
      const combo = e.shiftKey && (e.metaKey || e.getModifierState?.("Meta"));
      if (e.key === "PrintScreen" || combo) {
        blank(1500);
        setTimeout(reveal, 1500);
      }
    };
    const onBlur = () => blank();
    const onVisibility = () => (document.hidden ? blank() : reveal());

    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", reveal);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    return () => {
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", reveal);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
    };
  }, []);

  if (!blanked) return null;
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black px-6 text-center text-sm text-zinc-500"
    >
      Hidden to protect the author’s work.
    </div>
  );
}
