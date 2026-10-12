"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Author-only control to feature (pin) or unpin a review.
export function PinReviewButton({
  reviewId,
  pinned,
}: {
  reviewId: string;
  pinned: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    const res = await fetch(`/api/reviews/${reviewId}/pin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: !pinned }),
    });
    setBusy(false);
    if (res.ok) {
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      window.alert(d.error ?? "Could not update the pin.");
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className="shrink-0 rounded-full border border-ui-strong px-2.5 py-0.5 text-xs font-medium text-muted hover:bg-surface-soft disabled:opacity-50"
    >
      {pinned ? "Unpin" : "📌 Feature"}
    </button>
  );
}
