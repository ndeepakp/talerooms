"use client";

import { useCallback, useEffect, useId, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { BookCover } from "@/components/story/BookCover";
import type { CoverStyle } from "@/lib/cover-style";
import styles from "./BookPreview.module.css";

/** Only the published story's public synopsis is included in this preview. */
export type BookPreviewStory = {
  id: string;
  slug?: string | null;
  title: string;
  author: string | null;
  cover_url: string | null;
  cover_style: CoverStyle | null;
  summary?: string | null;
};

export function BookPreview({ story, variant = "shelf", href: destination, readLabel = "Read this story", readingDetails }: {
  story: BookPreviewStory;
  variant?: "featured" | "shelf";
  href?: string;
  readLabel?: string;
  readingDetails?: string;
}) {
  const [open, setOpen] = useState(false);
  const pageId = useId();
  const coverRef = useRef<HTMLButtonElement>(null);
  const href = destination ?? `/stories/${story.slug ?? story.id}`;
  const stageRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState({ width: 180, shift: 0 });
  const measure = useCallback(() => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return;
    const rail = stageRef.current?.closest('[data-book-rail]')?.getBoundingClientRect();
    const left = Math.max(16, (rail?.left ?? 0) + 16);
    const right = Math.min(window.innerWidth - 16, (rail?.right ?? window.innerWidth) - 16);
    const width = Math.min(180, (right - left) / 2);
    const center = rect.left + rect.width / 2;
    const safeCenter = Math.max(left + width, Math.min(center, right - width));
    setPlacement({ width, shift: safeCenter - center });
  }, []);
  const show = () => { measure(); setOpen(true); };
  const toggle = () => { measure(); setOpen(value => !value); };
  useEffect(() => {
    if (!open) return;
    window.addEventListener("resize", measure);
    const rail = stageRef.current?.closest('[data-book-rail]');
    const initialScroll = rail?.scrollLeft;
    const close = () => { if (rail?.scrollLeft !== initialScroll) setOpen(false); };
    rail?.addEventListener('scroll', close);
    return () => { window.removeEventListener("resize", measure); rail?.removeEventListener('scroll', close); };
  }, [open, measure]);
  return (
    <div
      className={`${styles.preview} ${variant === "shelf" ? styles.shelf : ""}`}
      style={{ "--spread-width": `${placement.width}px`, "--spread-shift": `${placement.shift}px` } as CSSProperties}
      data-open={open}
      onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}
      onKeyDown={event => {
        if (event.key === "Escape") {
          event.preventDefault();
          setOpen(false);
          coverRef.current?.focus();
        }
      }}
    >
      <div ref={stageRef} className={styles.stage}>
        <span className={styles.stageWord} aria-hidden="true">READ</span>
        <div
          className={styles.book}
          onCopy={event => event.preventDefault()}
          onDragStart={event => event.preventDefault()}
          onPointerEnter={event => { if (event.pointerType === "mouse") show(); }}
          onPointerLeave={event => {
            if (event.pointerType === "mouse" && !event.currentTarget.contains(document.activeElement)) setOpen(false);
          }}
        >
          <span className={styles.hoverArea} aria-hidden="true" />
          <button
            ref={coverRef}
            type="button"
            className={styles.cover}
            aria-expanded={open}
            aria-controls={pageId}
            aria-label={`${open ? "Close" : "Open"} preview of ${story.title}`}
            onClick={toggle}
          >
            <span className={styles.front}>
              <BookCover title={story.title} author={story.author} coverUrl={story.cover_url} coverStyle={story.cover_style} className={styles.coverArt} />
            </span>
            <span className={styles.back} aria-hidden="true"><span>talerooms.</span><i /><small>A home for<br />original stories.</small></span>
          </button>
          <div id={pageId} className={styles.page} aria-hidden={!open}>
            <p className={styles.kicker}>A GLIMPSE</p>
            <p className={styles.synopsis}>{story.summary?.trim() || "Meet a new voice. Open this story to discover where the first chapter takes you."}</p>
            {readingDetails && <p className={styles.readingDetails}>{readingDetails}</p>}
            <Link href={href} tabIndex={open ? 0 : -1} className={styles.readLink}>{readLabel}</Link>
            <span className={styles.pageNumber} aria-hidden="true">— 1 —</span>
          </div>
        </div>
      </div>
    </div>
  );
}
