import Link from "next/link";
import { PublicNavigation, PublicFooter } from "@/components/layout/PublicNavigation";
import { ChapterReader } from "@/components/reader/ChapterReader";
import { ShareButton } from "@/components/story/ShareButton";
import { StoryOverview, StoryChapters } from "@/components/story/StoryOverview";
import { RatingBreakdown } from "@/components/story/RatingBreakdown";
import { FollowButton } from "@/components/profile/FollowButton";
import { clampChapter, publicChapterReadable, type summarizeRatings } from "@/lib/story-overview";
import type { CoverStyle } from "@/lib/cover-style";

type PublicStory = {
  id: string;
  slug: string | null;
  title: string;
  summary: string;
  author: string | null;
  author_id: string;
  author_handle: string | null;
  author_image: string | null;
  subscription_price: number | null;
  genres: string[];
  cover_url: string | null;
  cover_style: CoverStyle | null;
  chapters_public: boolean;
  preview_public: boolean;
  created_at: string;
};

type PublicChapter = { title: string | null; body: string };

// Private chapter bodies remain server-only. Only readable bodies enter the client reader.
export function PublicStoryView({ story, chapters, readMinutes, totalWords, views, ratings, chapterParam }: {
  story: PublicStory;
  chapters: PublicChapter[];
  readMinutes: number;
  totalWords: number;
  views: number;
  ratings: ReturnType<typeof summarizeRatings>;
  chapterParam?: string;
}) {
  const readable = (i: number) => publicChapterReadable(i, story.chapters_public, story.preview_public);
  const selectedChapter = clampChapter(chapterParam ? Number(chapterParam) : 0, chapters.length);
  const storyHref = `/stories/${story.slug ?? story.id}`;
  const authorHref = `/${story.author_handle ?? story.author_id}`;
  const hasReadable = chapters.some((_, i) => readable(i));
  const date = new Date(story.created_at).toLocaleDateString(undefined, {year:"numeric",month:"long",day:"numeric"});

  return <div className="min-h-screen w-full bg-[var(--page)] text-ink">
    <PublicNavigation />
    <main className="mx-auto w-full max-w-6xl px-5 pb-12 pt-4 sm:px-8 sm:pb-20">
      <article>
        <div className="mb-8 flex items-center justify-between gap-4"><Link href="/#stories" className="py-2 text-sm text-muted hover:text-ink">← Explore stories</Link><ShareButton title={story.title} /></div>
        <StoryOverview
          story={{title:story.title,author:story.author,authorHref,authorImage:story.author_image,coverUrl:story.cover_url,coverStyle:story.cover_style,genres:story.genres}}
          readMinutes={readMinutes} totalWords={totalWords} views={views}
          authorActions={<><FollowButton userId={story.author_id} initialFollowing={false} isLoggedIn={false} />{story.subscription_price !== null && <Link href={authorHref} className="py-2 text-xs text-muted underline underline-offset-4">Membership options</Link>}</>}
          access={<div className="rounded-2xl border border-ui bg-surface-raised p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">{chapters.length === 0 ? "Chapters coming soon" : story.chapters_public ? "Free to read" : story.preview_public ? "First chapter preview" : "Private chapters"}</p>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">{chapters.length === 0 ? "Join to follow the author and hear when the first chapter arrives." : story.chapters_public ? "Explore every published chapter. No account needed to read." : story.preview_public ? "Read the opening chapter. Sign in to see access options for the rest." : "The synopsis and chapter list are open. Sign in to see chapter access options."}</p>
            {hasReadable ? <Link href={`${storyHref}?chapter=0#reading-room`} className="btn-primary mt-4 flex min-h-12 items-center justify-center rounded-full px-4 text-sm font-semibold">{story.chapters_public ? "Start reading" : "Read the preview"}<span aria-hidden="true" className="ml-2">→</span></Link> : <Link href="/signup" className="btn-primary mt-4 flex min-h-12 items-center justify-center rounded-full px-4 text-sm font-semibold">Create a free account</Link>}
            {!story.chapters_public && <Link href="/login" className="mt-3 flex min-h-11 items-center justify-center text-xs font-medium text-muted hover:text-ink">Already a member? Log in</Link>}
          </div>}
        >
          <p className="text-xs font-medium uppercase tracking-[.16em] text-muted">A Talerooms story</p>
          <h1 className="mt-4 hidden break-words font-serif text-5xl leading-tight tracking-tight lg:block">{story.title}</h1>
          <p className="mt-4 text-sm text-muted">Published {date}</p>
          {story.genres.length > 0 && <div className="mt-5 flex flex-wrap gap-2">{story.genres.map(name => <span key={name} className="rounded-full border border-ui px-3 py-1 text-xs text-ink-soft">{name}</span>)}</div>}
          <section className="mt-8" aria-labelledby="synopsis-title"><h2 id="synopsis-title" className="text-xs font-semibold uppercase tracking-wider text-muted">About the story</h2><p className="mt-4 whitespace-pre-wrap break-words text-lg leading-relaxed text-ink-soft">{story.summary || "The author hasn't added a synopsis yet."}</p></section>
          <StoryChapters storyHref={storyHref} entries={chapters.map((c,i)=>({title:c.title,index:i,access:story.chapters_public ? "Free" : readable(i) ? "Preview" : "Locked"}))} />
          <section className="mt-8" aria-label="Reader ratings"><RatingBreakdown ratings={ratings} /></section>
        </StoryOverview>
        {chapters.length > 0 && <section id="reading-room" aria-labelledby="reading-title" className="mt-12 scroll-mt-8 border-t border-ui pt-8">
          <div className="mx-auto max-w-4xl"><h2 id="reading-title" className="font-serif text-3xl">The reading room</h2>
            <ChapterReader key={selectedChapter} canInteract={false} storyId={story.id}
              chapters={chapters.map((c,i)=>({index:i,title:c.title,body:readable(i) ? Buffer.from(c.body,"utf8").toString("base64") : null,locked:!readable(i),prompts:[]}))}
              initialChapter={selectedChapter} initialPage={0} initialBookmarks={[]} autoResume={false} authorName={story.author}
              lockedNote="This chapter is private. Sign in to see access options." />
          </div>
        </section>}
        <div className="mx-auto mt-8 max-w-4xl border-t border-ui pt-6 text-sm leading-relaxed text-muted">
          <p>Make it your reading room. <Link href="/signup" className="font-medium text-ink underline underline-offset-4">Join free</Link> to follow {story.author ?? "this author"}, save your place, and hear when a new chapter arrives.</p>
        </div>
      </article>
    </main>
    <PublicFooter />
  </div>;
}
