"use client";

import { useState } from "react";
import Link from "next/link";
import { BookCover } from "@/components/story/BookCover";
import type { CoverStyle } from "@/lib/cover-style";
import styles from "./Discovery.module.css";

type Resume = {
  story_id: string;
  slug: string | null;
  title: string;
  author: string | null;
  cover_url: string | null;
  cover_style: CoverStyle | null;
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
    <section aria-label="Continue reading" className={styles.resume}>
      <button type="button" onClick={dismiss} aria-label="Dismiss continue reading" className={styles.dismiss}>✕</button>
      <div className={styles.resumeCover} aria-hidden="true"><BookCover title={resume.title} author={resume.author} coverUrl={resume.cover_url} coverStyle={resume.cover_style} className="h-full w-full"/></div>
      <div className={styles.resumeDetails}>
        <p className={styles.kicker}>Continue reading</p>
        <h2 title={resume.title}>{resume.title}</h2>
        <p className={styles.resumeMeta}>by {resume.author ?? 'Unknown'} · Chapter {position + 1} of {resume.chapter_count}</p>
        <div className={styles.progress} role="progressbar" aria-label="Chapter position in story" aria-valuemin={0} aria-valuemax={resume.chapter_count} aria-valuenow={position} aria-valuetext={`At chapter ${position + 1} of ${resume.chapter_count}`}>
          <div style={{width: `${progress}%`}} />
        </div>
        <Link href={`/stories/${resume.slug ?? resume.story_id}#reading-room`} className="btn-primary">Resume chapter</Link>
      </div>
    </section>
  );
}
