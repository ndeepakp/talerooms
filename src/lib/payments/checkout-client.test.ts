// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestStripeCheckout } from './checkout-client';
afterEach(() => vi.unstubAllGlobals());
describe('Stripe checkout client boundary', () => {
  it('submits a stable request reference and accepts only the provider checkout URL', async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_test_example' })); vi.stubGlobal('fetch', fetcher);
    expect(await requestStripeCheckout('story', { scope: 'whole', duration: '1h' }, 'same-key')).toContain('checkout.stripe.com');
    expect(fetcher).toHaveBeenCalledWith('/api/stories/story/checkout', expect.objectContaining({ body: JSON.stringify({ scope: 'whole', duration: '1h', requestKey: 'same-key' }) }));
  });
  it.each(['https://checkout.stripe.com.evil.example/pay', 'javascript:alert(1)', 'http://checkout.stripe.com/pay'])('rejects unsafe destinations %s', async checkoutUrl => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ checkoutUrl })));
    await expect(requestStripeCheckout('story', {}, 'key')).rejects.toThrow('secure');
  });
  it('never falls back to a mock purchase or retries automatically on a lost response', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('network')); vi.stubGlobal('fetch', fetcher);
    await expect(requestStripeCheckout('story', {}, 'key')).rejects.toThrow('same checkout'); expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
