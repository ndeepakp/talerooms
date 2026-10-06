"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StarSvg } from "@/components/story/StarRating";

type MyReview = { stars: number; liked: string | null; disliked: string | null };

// Interactive 0.5-step star picker (left half of a star = .5, right half = whole).
function StarInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value;
  function pick(e: React.MouseEvent<HTMLButtonElement>, i: number) {
    const r = e.currentTarget.getBoundingClientRect();
    const half = e.clientX - r.left < r.width / 2;
    return i + (half ? 0.5 : 1);
  }
  return (
    <div className="flex items-center gap-3">
      <div className="inline-flex items-center gap-1" onMouseLeave={() => setHover(null)}>
        {[0, 1, 2, 3, 4].map((i) => {
          const fill = Math.max(0, Math.min(1, shown - i));
          return (
            <button
              type="button"
              key={i}
              onMouseMove={(e) => setHover(pick(e, i))}
              onClick={(e) => onChange(pick(e, i))}
              className="relative inline-block"
              style={{ width: 30, height: 30 }}
              aria-label={`${i + 1} stars`}
            >
              <span className="absolute inset-0 text-zinc-300 dark:text-zinc-600">
                <StarSvg />
              </span>
              <span
                className="absolute inset-0 overflow-hidden text-amber-400"
                style={{ width: `${fill * 100}%` }}
              >
                <StarSvg />
              </span>
            </button>
          );
        })}
      </div>
      <span className="text-sm font-medium text-muted">
        {shown >= 0.5 ? shown.toFixed(1) : "—"}
      </span>
    </div>
  );
}

export function ReviewPanel({
  storyId,
  initial,
  canReview,
}: {
  storyId: string;
  initial: MyReview | null;
  canReview: boolean;
}) {
  const router = useRouter();
  const [stars, setStars] = useState(initial?.stars ?? 0);
  const [liked, setLiked] = useState(initial?.liked ?? "");
  const [disliked, setDisliked] = useState(initial?.disliked ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canReview) {
    return (
      <p className="text-sm text-muted">
        Only readers with access to this story can leave a review.
      </p>
    );
  }

  async function submit() {
    if (!(stars >= 0.5)) {
      setError("Pick a star rating first.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/stories/${storyId}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stars, liked, disliked }),
    });
    setBusy(false);
    if (res.ok) {
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Could not save your review.");
    }
  }

  async function remove() {
    setBusy(true);
    await fetch(`/api/stories/${storyId}/reviews`, { method: "DELETE" });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-ui bg-surface-raised p-4">
      <p className="text-sm font-medium text-ink-soft">
        {initial ? "Your review" : "Rate this story"}
      </p>
      <div className="mt-2">
        <StarInput value={stars} onChange={setStars} />
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">What you liked</span>
          <textarea
            value={liked}
            onChange={(e) => setLiked(e.target.value)}
            rows={3}
            maxLength={1500}
            placeholder="What worked for you?"
            className="rounded-lg border border-ui-strong bg-surface-raised px-3 py-2 text-sm text-ink outline-none focus:border-zinc-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">What you didn&apos;t</span>
          <textarea
            value={disliked}
            onChange={(e) => setDisliked(e.target.value)}
            rows={3}
            maxLength={1500}
            placeholder="What could be better? (optional)"
            className="rounded-lg border border-ui-strong bg-surface-raised px-3 py-2 text-sm text-ink outline-none focus:border-zinc-900"
          />
        </label>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="rounded-full btn-primary px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {initial ? "Update review" : "Post review"}
        </button>
        {initial && (
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="text-sm text-subtle hover:text-red-600 dark:hover:text-red-400"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
