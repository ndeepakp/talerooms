export async function requestStripeCheckout(storyId: string, payload: object, requestKey: string): Promise<string> {
  let response: Response;
  try {
    response = await fetch(`/api/stories/${storyId}/checkout`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, requestKey }) });
  } catch { throw new Error('Connection lost. Retry the same checkout; do not submit another payment.'); }
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error || 'Unable to open checkout. Retry the same selection.');
  if (typeof data?.checkoutUrl !== 'string') throw new Error('Checkout did not return a secure payment link.');
  const url = new URL(data.checkoutUrl);
  if (!(url.protocol === 'https:' && url.hostname === 'checkout.stripe.com') && !(url.origin === window.location.origin && url.pathname === '/payments/return')) throw new Error('Checkout did not return a secure payment link.');
  return url.href;
}
