import { afterEach, describe, expect, it, vi } from 'vitest';
import { completeMockRequest } from './mock-checkout';
afterEach(() => vi.unstubAllGlobals());
describe('mock checkout client results', () => {
  it('accepts server-confirmed success', async () => { vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('{}',{status:200}))); expect(await completeMockRequest('/api/test',{method:'POST'})).toEqual({ok:true}); });
  it('shows server validation errors', async () => { vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({error:'Verify your email'},{status:403}))); expect(await completeMockRequest('/api/test',{})).toEqual({ok:false,error:'Verify your email'}); });
  it('handles invalid error bodies', async () => { vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('error',{status:500}))); expect((await completeMockRequest('/api/test',{})).ok).toBe(false); });
  it('reports ambiguous network failure without retrying or leaving controls stuck', async () => { const fetcher=vi.fn().mockRejectedValue(new Error('offline')); vi.stubGlobal('fetch',fetcher); const result=await completeMockRequest('/api/test',{}); expect(result.ok).toBe(false); if(!result.ok)expect(result.error).toContain('Refresh'); expect(fetcher).toHaveBeenCalledTimes(1); });
});
