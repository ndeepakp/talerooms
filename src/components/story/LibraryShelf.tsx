import Link from "next/link";
import { BookPreview } from "@/components/story/BookPreview";
import type { CoverStyle } from "@/lib/cover-style";

export type LibraryStory = {
  id: string;
  slug: string | null;
  title: string;
  author: string | null;
  author_handle: string | null;
  cover_url: string | null;
  cover_style: CoverStyle | null;
  summary?: string | null;
  chapter_index: number;
  chapter_count: number;
  has_new: boolean;
};

/** Presentational shelf; authentication and the reading history query stay in the page. */
export function LibraryShelf({ stories }: { stories: LibraryStory[] }) {
  return (
    <main className="min-h-screen bg-[var(--page)] px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted">A little space for your stories</p>
            <h1 className="font-serif text-4xl font-medium tracking-tight text-ink sm:text-5xl">Your library<span className="text-accent">.</span></h1>
            <p className="mt-3 max-w-md text-sm leading-6 text-muted">Good stories stay with you. Pick up where you left off.</p>
          </div>
          {stories.length > 0 && <span className="shrink-0 rounded-full border border-ui bg-surface px-3 py-1.5 text-xs font-medium text-ink-soft">{stories.length} {stories.length === 1 ? "book" : "books"}</span>}
        </div>
        <div className="shelf-case mt-8 sm:mt-10">
          {stories.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-soft text-ink" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" className="h-8 w-8"><path d="M4 4h6v16H4zM10 4h4v16h-4zM15 5l4-1 4 15-4 1z" /></svg>
              </span>
              <h2 className="font-serif text-2xl text-ink">Your next favorite is out there.</h2>
              <p className="mt-2 max-w-xs text-sm leading-6 text-muted">Start a story and it will find a home here, ready whenever you are.</p>
              <Link href="/feed" className="btn-primary mt-6 inline-flex min-h-11 items-center rounded-full px-6 text-sm font-medium">Explore stories <span className="ml-3" aria-hidden="true">↗</span></Link>
            </div>
          ) : (
            <div className="shelf">
              {stories.map((s) => {
                const chapter = Math.min(s.chapter_index + 1, s.chapter_count);
                return (
                  <div key={s.id} className="group relative min-w-0">
                    <div className="relative">
                      <BookPreview story={s} href={`/stories/${s.slug ?? s.id}?chapter=${s.chapter_index}`} readLabel="Continue reading" />
                      {s.has_new && <span className="pointer-events-none absolute -right-2 top-2 rounded-full border border-ui bg-surface-raised px-2.5 py-1 text-[10px] font-semibold text-ink shadow-card">New chapter</span>}
                    </div>
                    <div className="shelf-ledge" />
                    <Link href={`/stories/${s.slug ?? s.id}?chapter=${s.chapter_index}`}><h2 className="mt-3 truncate font-serif text-base font-semibold text-ink">{s.title}</h2></Link>
                    <p className="mt-0.5 truncate text-xs text-muted">{s.author ?? "Unknown"}</p>
                    <p className="mt-2 text-[11px] text-muted">{s.chapter_count > 0 ? `Last opened · ${chapter} / ${s.chapter_count}` : "No chapters yet"}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
