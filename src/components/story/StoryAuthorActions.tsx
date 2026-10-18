"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { DeleteStoryButton } from "./DeleteStoryButton";

export function StoryAuthorActions({ storyId }: { storyId: string }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); }
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  return <div ref={root} className="story-author-actions" onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
  }}>
    <button ref={trigger} type="button" className="story-toolbar-button story-more-button" aria-label="Manage story" aria-expanded={open} onClick={() => setOpen(!open)}>
      <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="19" cy="12" r="1.7" /></svg>
    </button>
    {open && <div className="story-author-popover" role="region" aria-label="Story management">
      <p className="px-3 pb-2 pt-1 text-xs font-medium text-muted">Manage your story</p>
      <Link href={`/stories/${storyId}/edit`} className="story-author-action">Edit story</Link>
      <div className="my-1 border-t border-ui" />
      <DeleteStoryButton storyId={storyId} redirectTo="/feed" className="story-author-action text-danger" />
    </div>}
  </div>;
}
