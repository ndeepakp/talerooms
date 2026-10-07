'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { discoveryShelves, type DiscoveryStory } from '@/lib/discovery';
import { DiscoveryShelf } from './DiscoveryShelf';
import styles from './Discovery.module.css';
export function DiscoveryFeed({ stories, preferredGenres }: { stories: DiscoveryStory[]; preferredGenres: string[] }) {
  const [genre, setGenre] = useState('All stories');
  const [expanded, setExpanded] = useState(false);
  const shelves = useMemo(() => discoveryShelves(stories, preferredGenres), [stories, preferredGenres]);
  const genres = [...new Set(stories.flatMap(s => s.genres))].sort();
  const choices = ['All stories', ...genres];
  const visible = choices.slice(0, 4);
  // Keep a genre chosen from the expanded list visible after collapsing.
  if (!visible.includes(genre)) visible[visible.length - 1] = genre;
  const genreButton = (g: string) => <button type="button" key={g} aria-pressed={genre === g} onClick={() => setGenre(g)}>{g}</button>;
  const filtered = genre === 'All stories' ? shelves.all : shelves.all.filter(s => s.genres.includes(genre));
  return <>
    <DiscoveryShelf title="Explore the shelves" description={`${filtered.length} ${filtered.length === 1 ? 'story' : 'stories'}${genre === 'All stories' ? ' to get lost in' : ` in ${genre}`}.`} stories={filtered} genreLabel={genre === 'All stories' ? undefined : genre} filters={<div className={styles.genrePicker}>
      <div id="explore-genre-options" className={styles.filters} aria-label="Filter explore shelf by genre">{(expanded ? choices : visible).map(genreButton)}</div>
      {choices.length > 4 && <button type="button" className={styles.expandGenres} aria-label={expanded ? 'Show fewer genres' : 'Show all genres'} aria-expanded={expanded} aria-controls="explore-genre-options" onClick={() => setExpanded(value => !value)}>{expanded ? '−' : '+'}</button>}
    </div>} empty={<>The shelves are waiting for their first story. <Link href="/write">Write yours</Link>.</>}/>
    <DiscoveryShelf title={shelves.trending ? 'Trending in your genres' : 'Fresh in your genres'} description={shelves.trending ? 'Stories getting attention in the last seven days.' : 'Your next favourite could be waiting here.'} stories={shelves.personal} empty={<>No stories in your favourite genres yet. Browse the shelves or <Link href="/settings">update your genres</Link>.</>}/>
    <DiscoveryShelf title="From voices you follow" description="The latest stories from writers you come back for." stories={shelves.followed} empty={<>Follow an author from their profile to see their latest stories here.</>}/>
    <DiscoveryShelf title="Quick bites" description="Under 15 minutes. A little escape for your day." stories={shelves.quick} empty="No short reads here yet. Try a chapter from the other shelves."/>

  </>;
}
