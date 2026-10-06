import { type ReactNode } from "react";
import Link from "next/link";
import { BookPreview } from "@/components/story/BookPreview";
import { StarRating } from "@/components/story/StarRating";
import { formatCount } from "@/lib/format";
import { type CoverStyle } from "@/lib/cover-style";

export type BookshelfStory = {
  id: string;
  slug?: string | null;
  title: string;
  summary: string;
  author: string | null;
  author_id: string;
  author_handle: string | null;
  genres: string[];
  rating: number | null;
  rating_count: number;
  views: number;
  cover_url: string | null;
  cover_style: CoverStyle | null;
  chapters_public: boolean;
  whole_prices: Record<string, number>;
  currency: string;
};

function Rating({ s, size = 12 }: { s: BookshelfStory; size?: number }) {
  if (s.rating_count === 0) {
    return <span className="text-xs text-subtle">No ratings yet</span>;
  }
  return (
    <span className="inline-flex items-center gap-1">
      <StarRating value={s.rating ?? 0} size={size} />
      <span className="text-xs text-muted">
        {(s.rating ?? 0).toFixed(1)} ({s.rating_count})
      </span>
    </span>
  );
}

export function Bookshelf({
  stories,
  rightExtra,
}: {
  stories: BookshelfStory[];
  // Extra content for the right rail (e.g. the "Your week" panel).
  rightExtra?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6 md:flex-row">
      <div className="shelf-case flex-1">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-x-5 gap-y-8">
        {stories.map((s) => (
          <div key={s.id} className="group flex flex-col">
            <BookPreview story={s} />
            {/* Display ledge the cover stands on */}
            <div className="shelf-ledge" />
            <div className="mt-2.5 min-w-0">
              <Link
                href={`/stories/${s.slug ?? s.id}`}
                className="block truncate font-serif text-sm font-bold text-ink transition-colors group-hover:text-accent"
              >
                {s.title}
              </Link>
              <Link
                href={`/${s.author_handle ?? s.author_id}`}
                className="block truncate text-xs text-muted hover:text-ink"
              >
                {s.author ?? "Unknown"}
              </Link>
              <Link
                href={`/stories/${s.slug ?? s.id}/reviews`}
                className="mt-0.5 block"
                aria-label="See ratings"
              >
                <Rating s={s} size={11} />
              </Link>
              {s.views > 0 && (
                <p className="mt-0.5 flex items-center gap-1 text-xs text-subtle">
                  <span aria-hidden="true">👁</span>
                  {formatCount(s.views)} {s.views === 1 ? "read" : "reads"}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
      </div>

      {rightExtra && (
        <div className="flex w-full flex-col gap-5 md:w-[300px] md:shrink-0 lg:w-[340px]">
          {rightExtra}
        </div>
      )}
    </div>
  );
}
