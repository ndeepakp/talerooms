import { StarRating } from "@/components/story/StarRating";
import type { summarizeRatings } from "@/lib/story-overview";

export function RatingBreakdown({ ratings }: { ratings: ReturnType<typeof summarizeRatings> }) {
  return (
    <div className="rounded-2xl border border-ui bg-surface-raised p-5 sm:p-6">
      <div className="grid gap-6 sm:grid-cols-[1fr_1.5fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Reader ratings</p>
          {ratings.count ? <><p className="mt-3 font-serif text-5xl">{ratings.average?.toFixed(1)}<span className="ml-2 font-sans text-base text-muted">/ 5</span></p><div className="mt-3"><StarRating value={ratings.average ?? 0} size={18} /></div><p className="mt-2 text-xs text-muted">{ratings.count} {ratings.count === 1 ? "review" : "reviews"}</p></> : <p className="mt-4 text-sm text-muted">No ratings yet. A new story to discover.</p>}
        </div>
        {ratings.count > 0 && <ul className="space-y-3" aria-label="Rating distribution">
          {[5,4,3,2,1].map(stars => {
            const count = ratings.bins[stars - 1];
            return <li key={stars} className="flex items-center gap-3 text-xs">
              <span className="w-12 shrink-0 text-muted">{stars - .5}–{stars} <span aria-hidden="true">★</span><span className="sr-only">stars</span></span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-soft" aria-hidden="true"><div className="h-full rounded-full bg-accent" style={{width:`${count / ratings.count * 100}%`}} /></div>
              <span className="w-7 text-right tabular-nums text-ink-soft">{count}<span className="sr-only"> {count === 1 ? "review" : "reviews"}</span></span>
            </li>;
          })}
        </ul>}
      </div>
    </div>
  );
}
