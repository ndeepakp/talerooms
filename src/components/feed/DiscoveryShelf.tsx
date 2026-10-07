'use client';
import Link from 'next/link';
import { BookPreview } from '@/components/story/BookPreview';
import { estimatedRead, type DiscoveryStory } from '@/lib/discovery';
import styles from './Discovery.module.css';

export function DiscoveryShelf({ title, description, stories, empty, genreLabel, filters, moreFilters }: { title: string; description: string; stories: DiscoveryStory[]; empty: React.ReactNode; genreLabel?: string; filters?: React.ReactNode; moreFilters?: React.ReactNode }) {
  return <section className={styles.section} aria-label={title}>
    <div className={`${styles.sectionHeader} ${filters ? styles.withFilters : ''}`}><div><h2>{title}</h2><p>{description}</p></div>
      {filters && <div className={styles.filterGroup}>{filters}{moreFilters}</div>}
    </div>
    {stories.length ? <div data-book-rail className={styles.bookRail} tabIndex={0} aria-label={`${title} books, scroll horizontally`}>
      {stories.map(s => <article className={styles.card} key={s.id}>
        <BookPreview story={s}/>
        <h3><Link href={`/stories/${s.slug ?? s.id}`}>{s.title}</Link></h3>
        <Link className={styles.author} href={`/${s.author_handle ?? s.author_id}`}>{s.author ?? 'Unknown author'}</Link>
        <div className={styles.meta}><span title={s.genres.join(' · ')}>{genreLabel ?? (s.genres.slice(0, 2).join(' · ') || 'Original fiction')}{!genreLabel && s.genres.length > 2 ? ` +${s.genres.length - 2}` : ''}</span>{s.word_count > 0 && <span>~{estimatedRead(s.word_count)} min</span>}{s.rating_count > 0 && <span>★ {s.rating?.toFixed(1)} · {s.rating_count} ratings</span>}</div>
      </article>)}
    </div> : <div className={styles.empty}>{empty}</div>}
  </section>;
}
