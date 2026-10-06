import Link from "next/link";
import type { ReactNode } from "react";
import { Avatar } from "@/components/layout/Avatar";
import { BookCover } from "@/components/story/BookCover";
import { formatCount } from "@/lib/format";
import type { CoverStyle } from "@/lib/cover-style";

export type ChapterEntry = { title: string | null; index: number; access: "Free" | "Preview" | "Purchased" | "Subscriber" | "Author" | "Locked" };

export function StoryChapters({ entries, storyHref, lastOpened }: { entries: ChapterEntry[]; storyHref: string; lastOpened?: number }) {
  return <section aria-labelledby="contents-title" className="mt-9 border-t border-ui pt-7">
    <div className="flex items-center justify-between gap-3"><h2 id="contents-title" className="font-serif text-2xl">Inside this story</h2><span className="text-xs text-muted">{entries.length} {entries.length === 1 ? "chapter" : "chapters"}</span></div>
    {entries.length ? <ol className="mt-4 divide-y divide-ui">
      {entries.map(entry => <li key={entry.index}><Link href={`${storyHref}?chapter=${entry.index}#reading-room`} className="flex min-h-16 items-center gap-4 rounded-lg px-2 py-3 transition-colors hover:bg-surface-soft">
        <span className="w-6 shrink-0 font-serif text-lg tabular-nums text-subtle">{String(entry.index + 1).padStart(2,'0')}</span>
        <span className="min-w-0 flex-1"><span className="block break-words text-sm font-medium text-ink">{entry.title ?? (entries.length === 1 ? "Read the story" : `Chapter ${entry.index + 1}`)}</span>{lastOpened === entry.index && <span className="mt-1 block text-xs text-muted">Last opened</span>}</span>
        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] ${entry.access === 'Locked' ? 'border-ui text-muted' : 'border-ui-strong bg-surface-raised text-ink-soft'}`}>{entry.access}</span>
      </Link></li>)}
    </ol> : <p className="mt-4 text-sm text-muted">The first chapter is still to come.</p>}
  </section>;
}

export function StoryOverview({ story, readMinutes, totalWords, views, authorActions, access, children }: {
  story: { title: string; author: string | null; authorHref: string; authorImage?: string | null; coverUrl: string | null; coverStyle: CoverStyle | null; genres: string[] };
  readMinutes: number;
  totalWords: number;
  views: number;
  authorActions?: ReactNode;
  access: ReactNode;
  children: ReactNode;
}) {
  return <><h1 className="mb-6 break-words font-serif text-4xl leading-tight tracking-tight lg:hidden">{story.title}</h1><div className="grid gap-8 lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)] lg:gap-14">
    <aside aria-label="Book and author" className="min-w-0 lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:self-start lg:overflow-y-auto">
      <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-5 sm:grid-cols-[160px_minmax(0,1fr)] lg:block">
        <div className="rounded-2xl border border-ui bg-surface-soft p-3 lg:p-6"><BookCover title={story.title} author={story.author} coverUrl={story.coverUrl} coverStyle={story.coverStyle} className="aspect-[2/3] w-full" /></div>
        <div className="flex min-w-0 flex-col justify-center lg:mt-5 lg:rounded-2xl lg:border lg:border-ui lg:bg-surface-raised lg:p-5">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[.16em] text-muted">The voice behind the story</p>
          <Link href={story.authorHref} className="flex min-w-0 items-center gap-3 rounded-lg"><Avatar src={story.authorImage} name={story.author} size={36} /><span className="min-w-0 break-words text-sm font-semibold">{story.author ?? "Unknown author"}</span></Link>
          {authorActions && <div className="mt-4 flex flex-wrap items-center gap-2">{authorActions}</div>}
        </div>
      </div>
      <div className="mt-5">{access}</div>
      <dl className="mt-5 grid grid-cols-2 gap-x-5 gap-y-4 rounded-2xl border border-ui p-5 text-sm">
        <div><dt className="text-xs text-muted">Reading time</dt><dd className="mt-1 font-medium">{readMinutes > 0 ? `~${readMinutes} min` : "—"}</dd></div>
        <div><dt className="text-xs text-muted">Words</dt><dd className="mt-1 font-medium">{formatCount(totalWords)}</dd></div>
        <div className="col-span-2"><dt className="text-xs text-muted">Reads</dt><dd className="mt-1 font-medium">{formatCount(views)}</dd></div>
      </dl>
    </aside>
    <div className="min-w-0">{children}</div>
  </div></>;
}
