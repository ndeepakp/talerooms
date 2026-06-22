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
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Your library
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Pick up where you left off — and see when a new chapter drops.
        </p>

        {stories.length === 0 ? (
          <p className="mt-10 text-center text-zinc-500">
            Nothing here yet.{" "}
            <Link href="/feed" className="underline">
              Find a story
            </Link>{" "}
            to start reading.
          </p>
        ) : (
          <ul className="mt-6 flex flex-col gap-3">
            {stories.map((s) => {
              const done = Math.min(s.chapter_index + 1, s.chapter_count);
              const pct = s.chapter_count > 0 ? (done / s.chapter_count) * 100 : 0;
              return (
                <li key={s.id}>
                  <Link
                    href={`/stories/${s.slug ?? s.id}?chapter=${s.chapter_index}`}
                    className="flex gap-4 rounded-2xl border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-600"
                  >
                    <BookCover
                      title={s.title}
                      author={s.author}
                      coverUrl={s.cover_url}
                      coverStyle={s.cover_style}
                      className="h-24 w-16 shrink-0 rounded-md"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h2 className="truncate font-semibold text-zinc-900 dark:text-zinc-50">
                          {s.title}
                        </h2>
                        {s.has_new && (
                          <span className="shrink-0 rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-semibold text-accent">
                            ✨ New chapter
                          </span>
                        )}
                      </div>
                      <p className="truncate text-xs text-zinc-500">
                        by {s.author ?? "Unknown"}
                      </p>
                      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                        {s.chapter_count > 0
                          ? `Chapter ${done} of ${s.chapter_count}`
                          : "No chapters yet"}
                      </p>
                      {s.chapter_count > 0 && (
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                          <div
                            className="h-full rounded-full bg-accent"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
