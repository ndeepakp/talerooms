import type { BookshelfStory } from '@/components/story/Bookshelf';
import { readingMinutes } from './story-validation';

export type DiscoveryStory = BookshelfStory & {
  created_at: string;
  recent_views: number;
  word_count: number;
  followed: boolean;
};

export function discoveryShelves(stories: DiscoveryStory[], preferredGenres: string[]) {
  const recent = [...stories].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const preferred = recent.filter(s => !preferredGenres.length || s.genres.some(g => preferredGenres.includes(g)));
  const trending = preferred.some(s => s.recent_views > 0);
  return {
    trending,
    personal: [...preferred].sort((a, b) => b.recent_views - a.recent_views).slice(0, 12),
    followed: recent.filter(s => s.followed).slice(0, 12),
    quick: recent.filter(s => s.word_count > 0 && readingMinutes(s.word_count) < 15).slice(0, 12),
    all: recent,
  };
}

export function estimatedRead(words: number) { return readingMinutes(words); }

/** Activity days and streaks use UTC calendar days, matching the UI label. */
export function readingActivity(days: string[], now = new Date()) {
  const active = new Set(days);
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dayKey = (offset: number) => new Date(today.getTime() - offset * 86400000).toISOString().slice(0, 10);
  const week = Array.from({ length: 7 }, (_, i) => ({ day: dayKey(6 - i), active: active.has(dayKey(6 - i)) }));
  let offset = active.has(dayKey(0)) ? 0 : 1;
  let streak = 0;
  while (active.has(dayKey(offset++))) streak++;
  return { week, streak, activeDays: week.filter(d => d.active).length };
}
