'use client';
import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { BookPreview } from '@/components/story/BookPreview';
import { estimatedRead, type DiscoveryStory } from '@/lib/discovery';
import styles from './Discovery.module.css';

export function DiscoveryShelf({ title, description, stories, empty, genreLabel, filters }: { title: string; description: string; stories: DiscoveryStory[]; empty: React.ReactNode; genreLabel?: string; filters?: React.ReactNode }) {
  const rail = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });
  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    const update = () => setEdges({ start: el.scrollLeft < 2, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2 });
    update();
    el.addEventListener('scroll', update);
    const observer = new ResizeObserver(update); observer.observe(el);
    return () => { el.removeEventListener('scroll', update); observer.disconnect(); };
  }, [stories]);
  function scroll(direction: number) {
    const el = rail.current;
    el?.scrollBy({ left: direction * el.clientWidth * .8, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }
  return <section className={styles.section} aria-label={title}>
    <div className={styles.sectionHeader}><div><h2>{title}</h2><p>{description}</p></div>
      {stories.length > 0 && <div className={styles.controls}><button onClick={() => scroll(-1)} disabled={edges.start} aria-label={`Previous books in ${title}`}>←</button><button onClick={() => scroll(1)} disabled={edges.end} aria-label={`Next books in ${title}`}>→</button></div>}
    </div>
    {filters}
    {stories.length ? <div ref={rail} data-book-rail className={styles.bookRail} tabIndex={0} aria-label={`${title} books, scroll horizontally`}>
      {stories.map(s => <article className={styles.card} key={s.id}>
        <BookPreview story={s}/>
        <h3><Link href={`/stories/${s.slug ?? s.id}`}>{s.title}</Link></h3>
        <Link className={styles.author} href={`/${s.author_handle ?? s.author_id}`}>{s.author ?? 'Unknown author'}</Link>
        <div className={styles.meta}><span title={s.genres.join(' · ')}>{genreLabel ?? (s.genres.slice(0, 2).join(' · ') || 'Original fiction')}{!genreLabel && s.genres.length > 2 ? ` +${s.genres.length - 2}` : ''}</span>{s.word_count > 0 && <span>~{estimatedRead(s.word_count)} min</span>}{s.rating_count > 0 && <span>★ {s.rating?.toFixed(1)} · {s.rating_count} ratings</span>}</div>
      </article>)}
    </div> : <div className={styles.empty}>{empty}</div>}
  </section>;
}
