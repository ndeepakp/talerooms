"use client";

import { useEffect } from "react";

// Story ids already pinged this page session, so a remount (React Strict Mode
// double-invokes effects, navigations, etc.) doesn't fire duplicate views.
const pinged = new Set<string>();

// Fire-and-forget view ping when a reader opens a story. Renders nothing. The
// server still dedupes per reader/hour and never counts the author's own views.
export function ViewTracker({ storyId }: { storyId: string }) {
  useEffect(() => {
    if (pinged.has(storyId)) return;
    pinged.add(storyId);
    fetch(`/api/stories/${storyId}/view`, { method: "POST" }).catch(() => {});
  }, [storyId]);
  return null;
}
