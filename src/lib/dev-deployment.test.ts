import { afterEach, describe, expect, it, vi } from 'vitest';
import robots from '@/app/robots';
import sitemap from '@/app/sitemap';
import config from '../../next.config';

vi.mock('@/lib/db', () => ({ sql: vi.fn(() => Promise.resolve([])) }));
afterEach(() => vi.unstubAllEnvs());

describe('isolated dev crawler policy', () => {
  it('blocks crawling, indexing headers and sitemap entries on dev', async () => {
    vi.stubEnv('DEPLOYMENT_ENV', 'dev');
    expect(robots()).toEqual({ rules: { userAgent: '*', disallow: '/' } });
    expect(await sitemap()).toEqual([]);
    const headers = await config.headers?.();
    expect(headers).toEqual([{ source: '/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' }] }]);
  });
  it('keeps public discovery on the configured production origin', async () => {
    vi.stubEnv('DEPLOYMENT_ENV', 'production');
    vi.stubEnv('BETTER_AUTH_URL', 'https://talerooms.com');
    expect(robots().sitemap).toBe('https://talerooms.com/sitemap.xml');
    expect((await sitemap())[0].url).toBe('https://talerooms.com');
    expect(await config.headers?.()).toEqual([]);
  });
});
