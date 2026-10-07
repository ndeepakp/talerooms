"use client";

import { useState } from "react";
import Link from "next/link";

type Resume = {
  story_id: string;
  slug: string | null;
  title: string;
  author: string | null;
  chapter_index: number;
  chapter_title: string | null;
  chapter_count: number;
};

// The "Continue reading" card, dismissible via the ✕. Dismissal is stored in a
// cookie (not localStorage) so the SERVER can see it and skip rendering the card
// — avoiding the flash where it appears then disappears on every reload. It
// comes back once the reader progresses to a different chapter (new cookie key).
export function ContinueReading({ resume }: { resume: Resume }) {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;

  function dismiss(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    document.cookie = `resume_dismissed=${resume.story_id}:${resume.chapter_index}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    setHidden(true);
  }

  const position = Math.min(resume.chapter_index, resume.chapter_count - 1);
  const progress = Math.max(0, Math.round(position / Math.max(1, resume.chapter_count) * 100));
  return (
    <section aria-label="Continue reading" className="relative my-7 rounded-3xl border border-ui bg-surface-raised p-6 sm:p-8">
      <button type="button" onClick={dismiss} aria-label="Dismiss continue reading" className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-surface-soft">✕</button>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 pr-6">
          <p className="text-[10px] font-bold uppercase tracking-[.18em] text-accent">Right where you left off</p>
          <h2 className="mt-2 font-serif text-3xl text-ink">{resume.title}</h2>
          <p className="mt-2 text-sm text-muted">Chapter {position + 1} of {resume.chapter_count}{resume.chapter_title ? ` · ${resume.chapter_title}` : ''} · by {resume.author ?? 'Unknown'}</p>
        </div>
        <Link href={`/stories/${resume.slug ?? resume.story_id}#reading-room`} className="btn-primary shrink-0 rounded-full px-6 py-3 text-center text-sm font-semibold">Resume chapter →</Link>
      </div>
      <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-surface-soft" role="progressbar" aria-label="Chapter position in story" aria-valuemin={0} aria-valuemax={resume.chapter_count} aria-valuenow={position} aria-valuetext={`At chapter ${position + 1} of ${resume.chapter_count}`}>
        <div className="h-full rounded-full bg-accent" style={{width: `${progress}%`}} />
      </div>
      <p className="mt-2 text-[11px] text-subtle">Your saved chapter position · page bookmark restored when you resume</p>
    </section>
  );
}
