import { describe, it, expect } from 'vitest';
import { discoveryShelves, readingActivity, type DiscoveryStory } from './discovery';
const story = (id: string, fields: Partial<DiscoveryStory> = {}) => ({ id, created_at: '2026-10-01', recent_views: 0, word_count: 238, followed: false, genres: ['Fantasy'], ...fields } as DiscoveryStory);
describe('discovery shelves', () => {
  it('ranks actual genre activity, includes followed authors outside preferences, and excludes long/empty reads', () => {
    const shelves = discoveryShelves([story('fresh', { created_at: '2026-10-07' }), story('popular', { recent_views: 3 }), story('followed', { genres: ['Drama'], followed: true, word_count: 3570 }), story('empty', { word_count: 0 })], ['Fantasy']);
    expect(shelves.trending).toBe(true);
    expect(shelves.personal.map(s => s.id)).toEqual(['popular', 'fresh', 'empty']);
    expect(shelves.followed.map(s => s.id)).toEqual(['followed']);
    expect(shelves.quick.map(s => s.id)).toEqual(['fresh', 'popular']);
  });
  it('falls back to fresh stories with no views or preferences', () => {
    const shelves = discoveryShelves([story('old'), story('new', { created_at: '2026-10-07' })], []);
    expect(shelves.trending).toBe(false);
    expect(shelves.personal.map(s => s.id)).toEqual(['new', 'old']);
  });
});
describe('reading activity', () => {
  const today = new Date('2026-10-07T12:00:00Z');
  it('counts unique days and allows an ongoing streak through yesterday', () => {
    expect(readingActivity(['2026-10-06', '2026-10-06', '2026-10-05', '2026-10-03'], today)).toMatchObject({ streak: 2, activeDays: 3 });
  });
  it('resets a broken streak and handles month boundaries', () => {
    expect(readingActivity(['2026-10-05'], today).streak).toBe(0);
    expect(readingActivity(['2026-10-01', '2026-09-30'], new Date('2026-10-01T01:00:00Z')).streak).toBe(2);
    expect(readingActivity([], today).activeDays).toBe(0);
  });
});
