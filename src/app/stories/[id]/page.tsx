import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";
import { Avatar } from "@/components/layout/Avatar";
import { StarRating } from "@/components/story/StarRating";
import { ReviewPanel } from "@/components/story/ReviewPanel";
import { PinReviewButton } from "@/components/story/PinReviewButton";
import { StoryOverview, StoryChapters } from "@/components/story/StoryOverview";
import { RatingBreakdown } from "@/components/story/RatingBreakdown";
import { FollowButton } from "@/components/profile/FollowButton";
import { ShareButton } from "@/components/story/ShareButton";
import { clampChapter, summarizeRatings, type RatingGroup } from "@/lib/story-overview";
import { type CoverStyle } from "@/lib/cover-style";
import { PostCard } from "@/components/post/PostCard";
import { PostComposer } from "@/components/post/PostComposer";
import { getStoryPosts } from "@/lib/posts";
import { resolveStory, isUuid } from "@/lib/slug";
import { DeleteStoryButton } from "@/components/story/DeleteStoryButton";
import { AccessPanel } from "@/components/story/AccessPanel";
import { ApprovedReadersList } from "@/components/story/ApprovedReadersList";
import { ViewTracker } from "@/components/reader/ViewTracker";
import { ChapterReader, type Bookmark } from "@/components/reader/ChapterReader";
import { SaveToCollection } from "@/components/story/SaveToCollection";
import { PublicStoryView } from "./PublicStoryView";
import type { Metadata } from "next";
import { RENEWAL_DISCOUNT_PCT, type Tier } from "@/lib/pricing";
import { htmlToText, wordCount, readingMinutes } from "@/lib/story-validation";

export const dynamic = "force-dynamic";

type Story = {
  id: string;
  title: string;
  summary: string;
  status: "draft" | "published";
  chapters_public: boolean;
  preview_public: boolean;
  offered_durations: Tier[];
  whole_prices: Partial<Record<Tier, number>>;
  currency: string;
  cover_url: string | null;
  cover_style: CoverStyle | null;
  created_at: string;
  author: string | null;
  author_id: string;
  author_handle: string | null;
  author_image: string | null;
  subscription_price: number | null;
  genres: string[];
};

type Chapter = {
  title: string | null;
  body: string;
  prices?: Partial<Record<Tier, number>>;
};

// Per-story SEO + social-share metadata. Drafts are marked noindex; published
// stories get a real title/description and (when there's a cover) an OG image so
// shared links look good.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id: param } = await params;
  const resolved = await resolveStory(param);
  if (!resolved) return { title: "Story · Talerooms" };
  const [s] = await sql<
    { title: string; summary: string; status: string; cover_url: string | null }[]
  >`SELECT title, summary, status, cover_url FROM stories WHERE id = ${resolved.id}`;
  if (!s || s.status !== "published") {
    return { title: "Talerooms", robots: { index: false, follow: false } };
  }
  const description = (s.summary || "A story on Talerooms.").slice(0, 200);
  // The og:image + twitter image come from opengraph-image.tsx (generated card).
  return {
    title: `${s.title} · Talerooms`,
    description,
    openGraph: { title: s.title, description, type: "article" },
    twitter: { card: "summary_large_image", title: s.title, description },
  };
}

export default async function StoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ chapter?: string }>;
}) {
  const { id: param } = await params;
  const { chapter: chapterParam } = await searchParams;

  // Session is optional: logged-out visitors get a public, indexable view.
  const session = await auth.api.getSession({ headers: await headers() });

  // The route param may be a clean slug or a legacy UUID. Resolve it, and if it
  // came in as a UUID, redirect to the canonical slug URL so the address bar
  // shows the readable form.
  const resolved = await resolveStory(param);
  if (!resolved) notFound();
  if (isUuid(param) && resolved.slug) {
    redirect(`/stories/${resolved.slug}${chapterParam ? `?chapter=${chapterParam}` : ""}`);
  }
  const id = resolved.id;

  // Public columns only. The private "chapters" (and the internal "body") are
  // fetched separately and ONLY for the author — they are never selected here,
  // so they cannot leak into the page for a non-author viewer.
  const rows = await sql<Story[]>`
    SELECT
      s.id,
      s.title,
      s.summary,
      s.status,
      s.chapters_public,
      s.preview_public,
      s.offered_durations,
      s.whole_prices,
      s.currency,
      s.cover_url,
      s.cover_style,
      s.created_at,
      u.name AS author,
      u.id AS author_id,
      u.username AS author_handle,
      u.image AS author_image,
      u.subscription_price,
      COALESCE(array_agg(g.name) FILTER (WHERE g.name IS NOT NULL), '{}') AS genres
    FROM stories s
    JOIN "user" u ON u.id = s.author_id
    LEFT JOIN story_genres sg ON sg.story_id = s.id
    LEFT JOIN genres g ON g.id = sg.genre_id
    WHERE s.id = ${id}
    GROUP BY s.id, u.name, u.id
  `;

  const story = rows[0];
  if (!story) notFound();

  const userId = session?.user.id ?? null;
  const isAuthor = userId === story.author_id;

  // A draft is private to its author — nobody else can reach it, not even its
  // public summary.
  if (story.status === "draft" && !isAuthor) notFound();

  // Public stats: distinct readers who bought access (used in the buy panel),
  // and total views from readers other than the author (story_views excludes the
  // author at insert time).
  const [counts] = await sql<{ buyers: number; views: number }[]>`
    SELECT
      (SELECT COUNT(DISTINCT user_id) FROM access_grants WHERE story_id = ${id})::int AS buyers,
      (SELECT COUNT(*) FROM story_views WHERE story_id = ${id})::int AS views
  `;
  const buyers = counts?.buyers ?? 0;
  const views = counts?.views ?? 0;

  // The full chapters (with per-chapter prices). We fetch them all server-side,
  // but only ever render the BODY of chapters this viewer may read — locked
  // chapter bodies are never placed in the HTML.
  const [crow] = await sql<{ chapters: Chapter[] }[]>`
    SELECT chapters FROM stories WHERE id = ${id}
  `;
  const allChapters: Chapter[] = Array.isArray(crow?.chapters) ? crow.chapters : [];

  // "X min read" — total words across every chapter (locked or not), at an
  // average reading speed. Computed server-side so it's accurate even when a
  // reader can't see all the chapter bodies.
  const totalWords = allChapters.reduce(
    (n, c) => n + wordCount(htmlToText(c.body ?? "")),
    0,
  );
  const readMinutes = readingMinutes(totalWords);

  // Public aggregate only; no reviewer identities or account state enter the guest view.
  const ratingGroups = await sql<RatingGroup[]>`
    SELECT stars::float AS stars, COUNT(*)::int AS count
    FROM reviews WHERE story_id = ${id} GROUP BY stars
  `;
  const ratings = summarizeRatings(ratingGroups);

  // Logged-out visitors get the public, indexable, shareable view: cover,
  // summary, read-time, and readable chapters (free stories, or the first
  // chapter when the author opted in), with a free-sign-up hook for the rest.
  if (!session) {
    return (
      <PublicStoryView
        story={{
          id: story.id,
          slug: resolved.slug,
          title: story.title,
          summary: story.summary,
          author: story.author,
          author_id: story.author_id,
          author_handle: story.author_handle,
          author_image: story.author_image,
          subscription_price: story.subscription_price,
          genres: story.genres,
          cover_url: story.cover_url,
          cover_style: story.cover_style,
          chapters_public: story.chapters_public,
          preview_public: story.preview_public,
          created_at: story.created_at,
        }}
        chapters={allChapters}
        readMinutes={readMinutes}
        totalWords={totalWords}
        ratings={ratings}
        chapterParam={chapterParam}
        views={views}
      />
    );
  }

  // Per-reader watermark label, used to trace any leaked screenshot of the
  // chapters back to the account that opened them.
  const [viewer] = await sql<{ username: string | null; name: string | null }[]>`
    SELECT username, name FROM "user" WHERE id = ${session.user.id}
  `;
  const watermark = viewer?.username
    ? `@${viewer.username}`
    : (viewer?.name ?? "reader");

  // Per-chapter access. The author and public stories unlock everything; a
  // reader unlocks the whole story (via a 'whole' grant) or individual chapters
  // they bought, as long as the grant hasn't expired.
  let unlockedWhole = isAuthor || story.chapters_public;
  const unlockedIdx = new Set<number>();
  // A returning reader (bought access to this story before, even expired) gets a
  // renewal discount on the buy panel.
  let returning = false;
  const [authorSubscription] = !isAuthor ? await sql<{ one: number }[]>`
    SELECT 1 AS one FROM subscriptions
    WHERE subscriber_id = ${session.user.id} AND author_id = ${story.author_id}
      AND expires_at > now()
  ` : [];
  const [following] = !isAuthor ? await sql<{ one: number }[]>`
    SELECT 1 AS one FROM follows
    WHERE follower_id = ${session.user.id} AND following_id = ${story.author_id}
  ` : [];
  if (!isAuthor && !story.chapters_public) {
    // An active subscription to the author unlocks all their private chapters.
    if (authorSubscription) unlockedWhole = true;

    const grants = await sql<{ scope: string; chapter_index: number | null }[]>`
      SELECT scope, chapter_index FROM access_grants
      WHERE story_id = ${id} AND user_id = ${session.user.id}
        AND (expires_at IS NULL OR expires_at > now())
    `;
    for (const g of grants) {
      if (g.scope === "whole") unlockedWhole = true;
      else if (g.chapter_index !== null) unlockedIdx.add(g.chapter_index);
    }

    const [hadGrant] = await sql<{ one: number }[]>`
      SELECT 1 AS one FROM access_grants
      WHERE story_id = ${id} AND user_id = ${session.user.id} LIMIT 1
    `;
    returning = !!hadGrant;
  }
  const chapterUnlocked = (i: number) => unlockedWhole || unlockedIdx.has(i);
  const anyLocked = allChapters.some((_, i) => !chapterUnlocked(i));
  const purchasable =
    !isAuthor &&
    !story.chapters_public &&
    story.offered_durations.length > 0 &&
    anyLocked;

  // This reader's bookmarks for this story (to show + jump to).
  const bookmarks =
    allChapters.length > 0
      ? await sql<Bookmark[]>`
          SELECT id, chapter_index, quote, occurrence FROM bookmarks
          WHERE user_id = ${session.user.id} AND story_id = ${id}
          ORDER BY created_at
        `
      : [];

  // Which chapter to open first: the ?chapter param (from a "continue" link),
  // else the reader's last saved position, else the first.
  let initialChapter = 0;
  let initialPage = 0;
  let hasReadingPosition = false;
  const paramChapter = chapterParam ? parseInt(chapterParam, 10) : NaN;
  const autoResume = Number.isInteger(paramChapter);
  if (autoResume) {
    initialChapter = paramChapter;
  } else if (allChapters.length > 0) {
    const [prog] = await sql<{ chapter_index: number; page_index: number }[]>`
      SELECT chapter_index, page_index FROM reading_progress
      WHERE user_id = ${session.user.id} AND story_id = ${id}
    `;
    if (prog) {
      hasReadingPosition = true;
      initialChapter = prog.chapter_index;
      initialPage = prog.page_index;
    }
  }

  // Author's roster of readers with access (for the revoke controls), grouped
  // per reader.
  let readers: {
    user_id: string;
    name: string | null;
    handle: string | null;
    label: string;
  }[] = [];
  if (isAuthor && !story.chapters_public) {
    const grants = await sql<
      {
        user_id: string;
        name: string | null;
        handle: string | null;
        scope: string;
        chapter_index: number | null;
        active: boolean;
      }[]
    >`
      SELECT ag.user_id, u.name, u.username AS handle, ag.scope, ag.chapter_index,
             (ag.expires_at IS NULL OR ag.expires_at > now()) AS active
      FROM access_grants ag
      JOIN "user" u ON u.id = ag.user_id
      WHERE ag.story_id = ${id}
      ORDER BY u.name NULLS LAST, ag.created_at
    `;
    const byUser = new Map<
      string,
      { name: string | null; handle: string | null; whole: boolean; chapters: Set<number> }
    >();
    for (const g of grants) {
      if (!g.active) continue;
      const e = byUser.get(g.user_id) ?? {
        name: g.name,
        handle: g.handle,
        whole: false,
        chapters: new Set<number>(),
      };
      if (g.scope === "whole") e.whole = true;
      else if (g.chapter_index !== null) e.chapters.add(g.chapter_index);
      byUser.set(g.user_id, e);
    }
    readers = [...byUser.entries()].map(([user_id, e]) => ({
      user_id,
      name: e.name,
      handle: e.handle,
      label: e.whole
        ? "whole story"
        : `${e.chapters.size} chapter${e.chapters.size === 1 ? "" : "s"}`,
    }));
  }

  // Reviews replace the old like/dislike. Only readers with access may review.
  const hasAccess = unlockedWhole || unlockedIdx.size > 0;
  const reviews = await sql<{
    id: string;
    stars: number;
    liked: string | null;
    disliked: string | null;
    pinned: boolean;
    author: string | null;
    handle: string | null;
    image: string | null;
    mine: boolean;
  }[]>`
    SELECT r.id, r.stars::float AS stars, r.liked, r.disliked, r.pinned,
           u.name AS author, u.username AS handle, u.image,
           (r.user_id = ${session.user.id}) AS mine
    FROM reviews r JOIN "user" u ON u.id = r.user_id
    WHERE r.story_id = ${id}
    ORDER BY r.pinned DESC, r.updated_at DESC
  `;
  const myReview = reviews.find((r) => r.mine) ?? null;

  // Posts the community has made about this story (replaces the old comments).
  const storyPosts = await getStoryPosts(id, session.user.id, resolved.slug);

  // Stories this one credits or resembles (set at publish time).
  const attributions = await sql<
    {
      kind: "inspired_by" | "similar";
      id: string;
      title: string;
      author: string | null;
    }[]
  >`
    SELECT a.kind, r.id, r.title, ru.name AS author
    FROM attributions a
    JOIN stories r ON r.id = a.related_story_id
    LEFT JOIN "user" ru ON ru.id = r.author_id
    WHERE a.story_id = ${id}
    ORDER BY a.kind
  `;

  const inspiredBy = attributions.filter((a) => a.kind === "inspired_by");
  const similar = attributions.filter((a) => a.kind === "similar");

  const date = new Date(story.created_at).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const storyHref = `/stories/${resolved.slug ?? story.id}`;
  const selectedChapter = clampChapter(initialChapter, allChapters.length);
  const firstReadable = allChapters.findIndex((_, i) => chapterUnlocked(i));
  const startChapter = chapterUnlocked(selectedChapter) ? selectedChapter : Math.max(0, firstReadable);

  return (
    <main className="min-h-screen w-full bg-[var(--page)] px-5 py-8 text-ink sm:px-8 sm:py-12">
      {!isAuthor && <ViewTracker storyId={story.id} />}
      <article className="mx-auto w-full max-w-6xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <Link href="/feed" className="py-2 text-sm text-muted hover:text-ink">← Your feed</Link>
          <div className="flex flex-wrap items-center gap-4">
            <ShareButton title={story.title} />
            {story.status === "published" && <SaveToCollection storyId={story.id} />}
            {isAuthor && <><Link href={`/stories/${story.id}/edit`} className="py-2 text-sm font-medium hover:underline">Edit story</Link><DeleteStoryButton storyId={story.id} redirectTo="/feed" /></>}
          </div>
        </div>
        <StoryOverview
          story={{title:story.title,author:story.author,authorHref:`/${story.author_handle ?? story.author_id}`,authorImage:story.author_image,coverUrl:story.cover_url,coverStyle:story.cover_style,genres:story.genres}}
          readMinutes={readMinutes} totalWords={totalWords} views={views}
          authorActions={!isAuthor ? <><FollowButton userId={story.author_id} initialFollowing={!!following} isLoggedIn={true} />{authorSubscription && <span className="rounded-full border border-ui px-3 py-1 text-xs text-muted">Subscribed</span>}{story.subscription_price !== null && !authorSubscription && <Link href={`/${story.author_handle ?? story.author_id}`} className="py-2 text-xs text-muted underline underline-offset-4">Membership options</Link>}</> : <span className="text-xs text-muted">Your story</span>}
          access={<>
            <div className="rounded-2xl border border-ui bg-surface-raised p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">{isAuthor ? "Author access" : story.chapters_public ? "Free to read" : unlockedWhole ? "Whole story access" : unlockedIdx.size ? "Chapter access" : "Private chapters"}</p>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{isAuthor ? "Preview your chapters and manage your story." : story.chapters_public ? "All published chapters are open to you." : unlockedWhole ? "Your current access includes every chapter." : "Open a chapter below to see its access status."}</p>
              {allChapters.length > 0 && <Link href={firstReadable >= 0 ? hasReadingPosition && chapterUnlocked(selectedChapter) ? "#reading-room" : `${storyHref}?chapter=${startChapter}#reading-room` : "#contents-title"} className="btn-primary mt-4 flex min-h-12 items-center justify-center rounded-full px-4 text-sm font-semibold">{firstReadable >= 0 ? hasReadingPosition ? "Continue reading" : "Start reading" : "View chapter list"}<span aria-hidden="true" className="ml-2">→</span></Link>}
            </div>
            {purchasable ? (
          <AccessPanel
            storyId={story.id}
            offered={story.offered_durations}
            wholePrices={story.whole_prices}
            currency={story.currency}
            chapters={allChapters.map((c, i) => ({
              index: i,
              title: c.title ?? "",
              prices: c.prices ?? {},
              owned: chapterUnlocked(i),
            }))}
            renewalDiscount={returning ? RENEWAL_DISCOUNT_PCT : undefined}
          />
        ) : (
          !isAuthor &&
          !story.chapters_public &&
          anyLocked && (
            <section className="rounded-2xl border border-ui bg-surface-raised p-5 text-sm text-muted">
              The author hasn&apos;t put these chapters up for sale yet — check
              back soon.
            </section>
          )
        )}
          </>}
        >
          <p className="text-xs font-medium uppercase tracking-[.16em] text-muted">{story.status === "draft" ? "Draft · only you can see this" : "A Talerooms story"}</p>
          <h1 className="mt-4 hidden break-words font-serif text-5xl leading-tight tracking-tight lg:block">{story.title}</h1>
          <p className="mt-4 text-sm text-muted">{story.status === "draft" ? "Created" : "Published"} {date}</p>
          {story.genres.length > 0 && <div className="mt-5 flex flex-wrap gap-2">{story.genres.map(name => <span key={name} className="rounded-full border border-ui px-3 py-1 text-xs text-ink-soft">{name}</span>)}</div>}
          <section className="mt-8" aria-labelledby="synopsis-title"><h2 id="synopsis-title" className="text-xs font-semibold uppercase tracking-wider text-muted">About the story</h2><p className="mt-4 whitespace-pre-wrap break-words text-lg leading-relaxed text-ink-soft">{story.summary || "The author hasn't added a synopsis yet."}</p></section>
          {inspiredBy.length > 0 && <div className="mt-6 rounded-xl border border-ui p-4"><p className="text-xs font-semibold text-muted">Inspired by</p><ul className="mt-2 space-y-2">{inspiredBy.map(a => <li key={a.id} className="text-sm text-ink-soft"><Link href={`/stories/${a.id}`} className="font-medium underline">{a.title}</Link> by {a.author ?? "Unknown"}</li>)}</ul></div>}
          <StoryChapters storyHref={storyHref} lastOpened={hasReadingPosition ? selectedChapter : undefined} entries={allChapters.map((c,i)=>({title:c.title,index:i,access:story.chapters_public ? "Free" : isAuthor ? "Author" : authorSubscription ? "Subscriber" : chapterUnlocked(i) ? "Purchased" : "Locked"}))} />
        </StoryOverview>
        {allChapters.length > 0 && <section id="reading-room" aria-labelledby="reading-title" className="mt-12 scroll-mt-24 border-t border-ui pt-8">
          <div className="mx-auto max-w-4xl"><h2 id="reading-title" className="font-serif text-3xl">The reading room</h2>
            {isAuthor && !story.chapters_public && <div className="mt-4"><p className="text-sm text-muted">{buyers === 0 ? "No readers have bought access yet." : `${buyers} ${buyers === 1 ? "reader has" : "readers have"} bought access.`}</p><ApprovedReadersList storyId={story.id} readers={readers} /></div>}
            <ChapterReader
              key={`${selectedChapter}-${initialPage}`}
              storyId={story.id}
              chapters={allChapters.map((c, i) => ({
                index: i,
                title: c.title,
                // Base64 the body so the chapter text isn't sitting in the page
                // source; the reader decodes it client-side after mount.
                body: chapterUnlocked(i)
                  ? Buffer.from(c.body, "utf8").toString("base64")
                  : null,
                locked: !chapterUnlocked(i),
                prompts: chapterUnlocked(i)
                  ? ((c as { prompts?: string[] }).prompts ?? [])
                  : [],
              }))}
              initialChapter={selectedChapter}
              initialPage={initialPage}
              initialBookmarks={bookmarks}
              autoResume={autoResume}
              watermark={story.status === "published" ? watermark : undefined}
              authorName={story.author}
            />
          </div>
        </section>}
        <div className="mx-auto max-w-4xl">
        <section className="mt-10 border-t border-ui pt-6 ">
          <h2 className="mb-5 font-serif text-2xl text-ink">Reviews</h2>
          <RatingBreakdown ratings={ratings} />

          <div className="mt-4">
            <ReviewPanel
              storyId={story.id}
              canReview={hasAccess}
              initial={
                myReview
                  ? {
                      stars: myReview.stars,
                      liked: myReview.liked,
                      disliked: myReview.disliked,
                    }
                  : null
              }
            />
          </div>

          {reviews.length > 0 && (
            <ul className="mt-6 flex flex-col gap-4">
              {reviews.map((r) => (
                <li
                  key={r.id}
                  className="rounded-xl border border-ui bg-surface-raised p-4 [overflow-wrap:anywhere]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar src={r.image} name={r.author} size={36} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink">
                          {r.author ?? "Reader"}
                          {r.mine && (
                            <span className="ml-1 text-xs font-normal text-subtle">
                              (you)
                            </span>
                          )}
                        </p>
                        <StarRating value={r.stars} size={14} />
                      </div>
                    </div>
                    <div className="flex max-w-full flex-wrap items-center gap-2">
                      {r.pinned && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                          📌 Featured by author
                        </span>
                      )}
                      {isAuthor && (
                        <PinReviewButton reviewId={r.id} pinned={r.pinned} />
                      )}
                    </div>
                  </div>
                  {r.liked && (
                    <p className="mt-2 text-sm text-ink-soft">
                      <span className="font-medium text-emerald-600 dark:text-emerald-400">
                        Liked:
                      </span>{" "}
                      {r.liked}
                    </p>
                  )}
                  {r.disliked && (
                    <p className="mt-1 text-sm text-ink-soft">
                      <span className="font-medium text-rose-600 dark:text-rose-400">
                        Could be better:
                      </span>{" "}
                      {r.disliked}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-10 border-t border-ui pt-6 ">
          <h2 className="text-lg font-semibold text-ink">
            Posts about this story
          </h2>
          <p className="mt-1 text-sm text-muted">
            Share your thoughts — your post goes to the community feed and links
            back here.
          </p>

          <div className="mt-4">
            <PostComposer
              attachStory={{ id: story.id, slug: resolved.slug, title: story.title }}
              placeholder="Write a post about this story… type @ to tag a person or another story"
            />
          </div>

          {storyPosts.length === 0 ? (
            <p className="mt-6 text-sm text-muted">
              No posts about this story yet — be the first.
            </p>
          ) : (
            <ul className="mt-6 flex flex-col gap-4">
              {storyPosts.map((p) => (
                <li key={p.id}>
                  <PostCard post={p} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {similar.length > 0 && (
          <section className="mt-10 border-t border-ui pt-6 ">
            <h2 className="text-lg font-semibold text-ink">
              Similar stories
            </h2>
            <ul className="mt-4 flex flex-col gap-2">
              {similar.map((a) => (
                <li key={a.id} className="text-sm text-ink-soft">
                  <Link href={`/stories/${a.id}`} className="font-medium underline">
                    {a.title}
                  </Link>{" "}
                  by {a.author ?? "Unknown"}
                </li>
              ))}
            </ul>
          </section>
        )}

        </div>
      </article>
    </main>
  );
}
