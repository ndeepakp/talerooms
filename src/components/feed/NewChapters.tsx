import Link from "next/link";
import { BookPreview } from "@/components/story/BookPreview";
import { type CoverStyle } from "@/lib/cover-style";

export type NewChapterStory = {
  id: string;
  slug: string | null;
  title: string;
  author: string | null;
  cover_url: string | null;
  cover_style: CoverStyle | null;
  summary?: string | null;
  chapter_index: number; // where the reader left off (resume here)
  new_count: number;
};

// A wrapping "New chapters for you" shelf at the top of the feed — stories the
// reader follows/owns access to that have dropped chapters they haven't seen.
export function NewChapters({ stories }: { stories: NewChapterStory[] }) {
  if (stories.length === 0) return null;
  return (
    <section className="mt-6">
      <h2 className="text-sm font-semibold text-ink">
        ✨ New chapters for you
      </h2>
      <div className="mt-3 grid grid-cols-[repeat(auto-fill,112px)] gap-5 pb-2">
        {stories.map((s) => (
          <div key={s.id} className="group min-w-0">
            <div className="relative">
              <BookPreview story={s} href={`/stories/${s.slug ?? s.id}?chapter=${s.chapter_index}`} readLabel="Continue reading" />
              <span className="pointer-events-none absolute right-1 top-1 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-accent-fg shadow">
                +{s.new_count}
              </span>
            </div>
            <Link href={`/stories/${s.slug ?? s.id}?chapter=${s.chapter_index}`} className="mt-1 block truncate text-xs font-medium text-ink">
              {s.title}
            </Link>
            <p className="truncate text-[11px] text-muted">
              {s.author ?? "Unknown"}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
