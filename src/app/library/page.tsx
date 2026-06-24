import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";
import { BookCover } from "@/components/story/BookCover";
import { type CoverStyle } from "@/lib/cover-style";

export const dynamic = "force-dynamic";

type LibraryStory = {
  id: string;
  slug: string | null;
  title: string;
  author: string | null;
  author_handle: string | null;
  cover_url: string | null;
  cover_style: CoverStyle | null;
  chapter_index: number;
  chapter_count: number;
  has_new: boolean;
};

export default async function LibraryPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  const me = session.user.id;

  // Everything the reader has opened (others' published stories), newest first.
  // `has_new` is an unseen "new chapter" notification for that story — the same
  // signal the serial loop emits when an author drops a chapter.
  const stories = await sql<LibraryStory[]>`
    SELECT
      s.id, s.slug, s.title,
      u.name AS author, u.username AS author_handle,
      s.cover_url, s.cover_style,
      rp.chapter_index,
      jsonb_array_length(s.chapters)::int AS chapter_count,
      EXISTS (
        SELECT 1 FROM notifications n
        WHERE n.user_id = ${me} AND n.kind = 'new_chapter'
          AND n.story_id = s.id AND NOT n.seen
      ) AS has_new
    FROM reading_progress rp
    JOIN stories s ON s.id = rp.story_id
    JOIN "user" u ON u.id = s.author_id
    WHERE rp.user_id = ${me}
      AND s.status = 'published'
      AND s.author_id <> ${me}
    ORDER BY rp.updated_at DESC
  `;

  return (
    <div className="min-h-screen bg-[var(--page)] px-6 py-12">
      <div className="mx-auto w-full max-w-5xl">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              Your library
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Pick up where you left off — hover a cover to see your progress.
            </p>
          </div>
          {stories.length > 0 && (
            <span className="shrink-0 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              {stories.length} {stories.length === 1 ? "book" : "books"}
            </span>
          )}
        </div>

        {stories.length === 0 ? (
          <div className="mt-10 shelf-case">
            <div className="flex flex-col items-center py-12 text-center">
              <span className="text-4xl" aria-hidden="true">
                📚
              </span>
              <p className="mt-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Your shelf is empty
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                Stories you start reading line up here.
              </p>
              <Link
                href="/feed"
                className="mt-5 rounded-full btn-primary px-5 py-2 text-sm font-medium"
              >
                Find a story
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-8 shelf-case">
            <div className="shelf">
              {stories.map((s) => {
                const done = Math.min(s.chapter_index + 1, s.chapter_count);
                const pct = s.chapter_count > 0 ? (done / s.chapter_count) * 100 : 0;
                return (
                  <Link
                    key={s.id}
                    href={`/stories/${s.slug ?? s.id}?chapter=${s.chapter_index}`}
                    className="group relative block h-36 w-24"
                    title={s.title}
                  >
                    <BookCover
                      title={s.title}
                      author={s.author}
                      coverUrl={s.cover_url}
                      coverStyle={s.cover_style}
                      className="h-36 w-24 rounded-[2px_4px_4px_2px] shadow-[2px_6px_12px_rgba(40,25,5,0.35)] transition-transform duration-200 ease-out will-change-transform group-hover:-translate-y-2 group-hover:shadow-[3px_12px_20px_rgba(40,25,5,0.45)]"
                    />
                    {/* Spine highlight, so each cover reads like a real book edge. */}
                    <span className="pointer-events-none absolute inset-y-0 left-0 w-[3px] rounded-l-[2px] bg-gradient-to-r from-white/40 to-transparent transition-transform duration-200 group-hover:-translate-y-2" />
                    {s.has_new && (
                      <span className="absolute -right-1 -top-1 z-10 rounded-full bg-accent px-1.5 py-0.5 text-[9px] font-bold text-accent-fg shadow transition-transform duration-200 group-hover:-translate-y-2">
                        ✨
                      </span>
                    )}
                    {/* Progress revealed on hover */}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 rounded-b-[4px] bg-gradient-to-t from-black/90 via-black/55 to-transparent p-2 opacity-0 transition-all duration-200 group-hover:-translate-y-2 group-hover:opacity-100">
                      <p className="truncate text-[10px] font-semibold text-white">
                        {s.title}
                      </p>
                      <p className="mt-0.5 text-[9px] text-white/75">
                        {s.chapter_count > 0
                          ? `Ch. ${done} / ${s.chapter_count}`
                          : "No chapters yet"}
                      </p>
                      {s.chapter_count > 0 && (
                        <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/25">
                          <div
                            className="h-full rounded-full bg-white"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
