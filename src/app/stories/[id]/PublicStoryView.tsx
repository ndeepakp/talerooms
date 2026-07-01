import Link from "next/link";
import { BookCover } from "@/components/story/BookCover";
import { ChapterReader } from "@/components/reader/ChapterReader";
import { ShareButton } from "@/components/story/ShareButton";
import { formatCount } from "@/lib/format";
import { type CoverStyle } from "@/lib/cover-style";

type PublicStory = {
  id: string;
  slug: string | null;
  title: string;
  summary: string;
  author: string | null;
  author_id: string;
  author_handle: string | null;
  genres: string[];
  cover_url: string | null;
  cover_style: CoverStyle | null;
  chapters_public: boolean;
  preview_public: boolean;
  created_at: string;
};

type PublicChapter = { title: string | null; body: string };

// The story page as seen by a logged-out visitor. Fully public (indexable +
// shareable): cover, title, author, summary, read-time. Chapters are readable
// only when free (chapters_public) or, for the first chapter, when the author
// opted into a public preview; everything else prompts a free sign-up.
export function PublicStoryView({
  story,
  chapters,
  readMinutes,
  views,
}: {
  story: PublicStory;
  chapters: PublicChapter[];
  readMinutes: number;
  views: number;
}) {
  const readable = (i: number) =>
    story.chapters_public || (i === 0 && story.preview_public);

  const date = new Date(story.created_at).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const authorHref = `/${story.author_handle ?? story.author_id}`;
  const hasLocked = chapters.some((_, i) => !readable(i));

  return (
    <div className="min-h-screen bg-[var(--page)] px-6 py-12">
      <article className="mx-auto w-full max-w-5xl">
        <div className="flex items-center justify-end">
          <ShareButton title={story.title} />
        </div>

        {(story.cover_url || story.cover_style) && (
          <BookCover
            title={story.title}
            author={story.author}
            coverUrl={story.cover_url}
            coverStyle={story.cover_style}
            className="mt-4 h-64 w-44 rounded-lg"
          />
        )}
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          {story.title}
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          by{" "}
          <Link href={authorHref} className="font-medium text-zinc-700 hover:underline dark:text-zinc-300">
            {story.author ?? "Unknown"}
          </Link>{" "}
          · {date}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-sm font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            <span aria-hidden="true">👁</span>
            <span>
              {formatCount(views)} {views === 1 ? "read" : "reads"}
            </span>
          </div>
          {readMinutes > 0 && (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-sm font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              <span aria-hidden="true">⏱</span>
              <span>{readMinutes} min read</span>
            </div>
          )}
        </div>

        {story.genres.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {story.genres.map((name) => (
              <span
                key={name}
                className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              >
                {name}
              </span>
            ))}
          </div>
        )}

        <div className="mt-8 whitespace-pre-wrap text-lg leading-8 text-zinc-800 dark:text-zinc-200">
          {story.summary}
        </div>

        {chapters.length > 0 && (
          <section className="mt-10 border-t border-zinc-200 pt-6 dark:border-zinc-800">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {chapters.length === 1 && !chapters[0].title ? "Story" : "Chapters"}
            </h2>
            <ChapterReader
              storyId={story.id}
              chapters={chapters.map((c, i) => ({
                index: i,
                title: c.title,
                body: readable(i)
                  ? Buffer.from(c.body, "utf8").toString("base64")
                  : null,
                locked: !readable(i),
                prompts: [],
              }))}
              initialChapter={0}
              initialPage={0}
              initialBookmarks={[]}
              autoResume={false}
              authorName={story.author}
              lockedNote="Create a free account to keep reading."
            />
          </section>
        )}

        {/* Sign-up hook. */}
        <section className="mt-10 rounded-2xl border border-zinc-200 bg-white p-6 text-center dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {hasLocked ? "Keep reading on Talerooms" : "Enjoying this?"}
          </h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-zinc-500">
            Create a free account to {hasLocked ? "read the rest, " : ""}follow{" "}
            {story.author ?? "this author"}, save your place, and get notified
            when a new chapter drops.
          </p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <Link
              href="/signup"
              className="rounded-full btn-primary px-5 py-2 text-sm font-medium"
            >
              Create a free account
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium text-zinc-600 hover:underline dark:text-zinc-400"
            >
              Log in
            </Link>
          </div>
        </section>
      </article>
    </div>
  );
}
