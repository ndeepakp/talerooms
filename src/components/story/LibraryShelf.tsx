"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookPreview } from "@/components/story/BookPreview";
import type { CoverStyle } from "@/lib/cover-style";
import { isFinished, libraryHref, matchesLibrary, readingPosition, type LibraryFilter, type LibraryMembership } from "@/lib/library";
import styles from "./LibraryShelf.module.css";

export type LibraryStory = LibraryMembership & {
  id: string; slug: string | null; author_handle: string | null;
  cover_url: string | null; cover_style: CoverStyle | null; summary: string | null;
  has_new: boolean; access_active: boolean;
};
const filters: { id: LibraryFilter; label: string }[] = [
  { id: "all", label: "All books" }, { id: "reading", label: "Reading" },
  { id: "finished", label: "Finished" }, { id: "purchased", label: "Purchased" },
  { id: "collections", label: "Collections" },
];
const emptyText: Record<LibraryFilter, [string, string]> = {
  all: ["Your next favourite is out there.", "Open a story or save one to a collection. It will find a home here."],
  reading: ["A new world is waiting.", "Start a story and come back here to pick up where you left off."],
  finished: ["Every ending belongs here.", "Mark a book as finished when you reach the end. Opening the last chapter won't do it for you."],
  purchased: ["Your purchased stories, together.", "Stories with paid access appear here, including access that has ended."],
  collections: ["Make room for your favourites.", "Use Save to collection on a story to build a collection of your own."],
};

export function LibraryShelf({ stories, collections }: { stories: LibraryStory[]; collections: { id: string; name: string }[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<LibraryFilter>("all");
  const [search, setSearch] = useState("");
  const [collection, setCollection] = useState("");
  const [overrides, setOverrides] = useState<Record<string, number | null>>({});
  const [pending, setPending] = useState<string[]>([]);
  const [error, setError] = useState("");
  const books = stories.map(s => Object.hasOwn(overrides, s.id) ? { ...s, completed_chapter_count: overrides[s.id] } : s);
  const visible = books.filter(s => matchesLibrary(s, filter, search, collection));
  async function changeStatus(story: LibraryStory) {
    setError(""); setPending(ids => [...ids, story.id]);
    try {
      const response = await fetch(`/api/stories/${story.id}/completion`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ finished: !isFinished(story) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save your reading status.");
      setOverrides(values => ({ ...values, [story.id]: data.completed_chapter_count }));
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save your reading status. Try again."); }
    finally { setPending(ids => ids.filter(id => id !== story.id)); }
  }
  return (
    <main className={styles.library}>
      <div className={styles.inner}>
        <header className={styles.heading}>
          <div><h1>Your library<span>.</span></h1><p>The stories you keep. The worlds you return to.</p></div>
          <Link href="/feed" className={styles.discover}>Explore stories <span aria-hidden="true">↗</span></Link>
        </header>
        <nav className={styles.filters} aria-label="Library filters">
          {filters.map(item => <button key={item.id} type="button" aria-pressed={filter === item.id} onClick={() => { setFilter(item.id); setCollection(""); }}>
            {item.label}<span>{books.filter(s => matchesLibrary(s, item.id)).length}</span>
          </button>)}
        </nav>
        <div className={styles.tools}>
          <label className={styles.search}><span aria-hidden="true">⌕</span><input aria-label="Search your library" placeholder="Search books or authors…" value={search} onChange={e => setSearch(e.target.value)} type="search" /></label>
          {collections.length > 0 && <label className={styles.collection}><span className="sr-only">Choose a collection</span><select value={collection} onChange={e => { setCollection(e.target.value); if (e.target.value) setFilter("collections"); }}><option value="">All collections</option>{collections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}
        </div>
        {filter === "purchased" && <p className={styles.note}>Access can cover a chapter or the whole story. Expired purchases stay on this shelf.</p>}
        {error && <p role="alert" className={styles.error}>{error}</p>}
        <p className={styles.results} role="status">{visible.length} {visible.length === 1 ? "book" : "books"}{search || collection ? " found" : " on this shelf"}</p>
        {visible.length === 0 ? <div className={styles.empty}>
          <svg aria-hidden="true" viewBox="0 0 80 70" fill="none" stroke="currentColor" strokeWidth="2"><rect x="8" y="10" width="18" height="48" rx="3"/><rect x="28" y="4" width="18" height="54" rx="3"/><path d="m52 11 14-3 10 47-14 3zM4 64h72M14 18h6M34 13h6"/></svg>
          <h2>{search || collection ? "No books match this shelf." : emptyText[filter][0]}</h2>
          <p>{search || collection ? "Try another title, author or collection." : emptyText[filter][1]}</p>
          {search || collection ? <button type="button" className="btn-primary" onClick={() => { setSearch(""); setCollection(""); }}>Clear filters</button> : <Link className="btn-primary" href="/feed">Discover a story</Link>}
        </div> : <div className={styles.gallery}>
          {visible.map(s => {
            const finished = isFinished(s), position = readingPosition(s);
            const hasProgress = s.chapter_index !== null && s.chapter_count > 0;
            const chapter = Math.min(Math.max((s.chapter_index ?? 0) + 1, 1), s.chapter_count);
            const details = finished ? "Finished" : hasProgress ? `Chapter ${chapter} of ${s.chapter_count} · page ${Math.max(0, Math.min(s.page_index ?? 0, (s.page_count ?? Number.MAX_SAFE_INTEGER) - 1)) + 1}` : "Saved for later";
            return <article key={s.id} className={styles.card}>
              <div className={styles.cover}><BookPreview story={s} href={libraryHref(s)} readLabel={hasProgress ? "Continue reading" : "Read this story"} readingDetails={hasProgress ? `${details} · ${position}% position` : undefined}/>
                {s.has_new && <span className={styles.badge}>New chapter</span>}
              </div>
              <Link href={libraryHref(s)} className={styles.title}><h2>{s.title}</h2></Link>
              <p className={styles.author}>{s.author ?? "Unknown author"}</p>
              <div className={styles.progress} role="progressbar" aria-label={`Reading position for ${s.title}`} aria-valuenow={position} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${position}%` }}/></div>
              <p className={styles.position}>{finished ? "Finished · 100%" : hasProgress ? `${position}% position · ${details}` : details}</p>
              {s.purchased && <p className={styles.access}>{s.access_active ? "Paid access available" : "Paid access ended"}</p>}
              <div className={styles.actions}><Link className="btn-primary" href={libraryHref(s)}>{hasProgress ? "Continue reading" : "Read this story"}</Link>
              {hasProgress && <button type="button" disabled={pending.includes(s.id)} onClick={() => changeStatus(s)} aria-label={`${finished ? "Move to reading" : "Mark as finished"}: ${s.title}`}>{pending.includes(s.id) ? "Saving…" : finished ? "Move to reading" : "Mark as finished"}</button>}</div>
            </article>;
          })}
        </div>}
        {books.some(s => s.chapter_index !== null) && <p className={styles.footnote}>Position follows your saved chapter and page, with chapters weighted equally. Older bookmarks use chapter position until you resume. Mark finished when you reach the end.</p>}
      </div>
    </main>
  );
}
