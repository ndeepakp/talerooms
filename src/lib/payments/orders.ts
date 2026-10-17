import { createHash, randomUUID } from 'node:crypto';
import Stripe from 'stripe';
import { sql } from '@/lib/db';
import { ApiError } from '@/lib/http';
import { expiryFor, type CurrencyCode } from '@/lib/pricing';
import { walletOrigin, approvedCountries } from '@/lib/wallet/policy';
import { buildStoryCheckout, stripeClient } from './stripe';
import { quoteStoryPurchase, PaymentQuoteError, type PurchaseItem } from './quote';

export type PaymentOrder = {
  id: string; buyer_id: string | null; author_id: string | null; story_id: string | null;
  request_hash: string; provider_account_id: string; story_title: string; currency: CurrencyCode;
  amount_minor: string | number; items: PurchaseItem[]; platform_fee_bps: number;
  status: 'created' | 'checkout_open' | 'paid' | 'expired'; checkout_session_id: string | null;
  mode: 'test' | 'live'; created_at: Date; paid_at: Date | null;
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function sandbox() {
  if ((process.env.STRIPE_MODE || 'test') !== 'test' || !process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') || !process.env.STRIPE_WEBHOOK_SECRET?.startsWith('whsec_')) throw new ApiError(503, 'Stripe sandbox checkout is not configured.');
}
export function purchaseFingerprint(storyId: string, body: Record<string, unknown>) {
  const indexes = Array.isArray(body.chapterIndexes) ? [...new Set(body.chapterIndexes)].sort((a,b) => Number(a)-Number(b)) : null;
  return createHash('sha256').update(JSON.stringify({ storyId, scope: body.scope, duration: body.duration, indexes })).digest('hex');
}
export async function startStripeCheckout(storyId: string, buyerId: string, body: Record<string, unknown>) {
  sandbox();
  if (typeof body.requestKey !== 'string' || !uuid.test(body.requestKey)) throw new ApiError(400, 'A valid checkout reference is required.');
  const hash = purchaseFingerprint(storyId, body);
  let [order] = await sql<PaymentOrder[]>`SELECT * FROM payment_orders WHERE buyer_id=${buyerId} AND request_key=${body.requestKey} AND mode='test'`;
  const stripe = stripeClient();
  if (!order) [order] = await sql<PaymentOrder[]>`SELECT * FROM payment_orders WHERE buyer_id=${buyerId} AND story_id=${storyId} AND request_hash=${hash} AND mode='test' AND status IN ('created','checkout_open')`;
  if (!order) {
    const [story] = await sql`SELECT id,title,author_id,currency,status,chapters_public,offered_durations,whole_prices,chapters FROM stories WHERE id=${storyId}`;
    if (!story || story.status !== 'published') throw new ApiError(404, 'Story not found.');
    const [account] = await sql`SELECT id,provider_id,country FROM author_payment_accounts WHERE user_id=${story.author_id} AND mode='test'`;
    if (!account?.provider_id || !approvedCountries().includes(account.country)) throw new ApiError(409, 'The author must complete Stripe payout setup before accepting payments.');
    const [details, identity] = await Promise.all([stripe.accounts.retrieve(account.provider_id), stripe.v2.core.accounts.retrieve(account.provider_id)]);
    if (details.deleted || identity.livemode || identity.metadata?.talerooms_account_id !== account.id || details.country !== account.country || !details.charges_enabled || !details.payouts_enabled) throw new ApiError(409, 'The author’s Stripe account is not ready to accept payments.');
    const [membership] = await sql`SELECT 1 FROM subscriptions WHERE subscriber_id=${buyerId} AND author_id=${story.author_id} AND expires_at>now() LIMIT 1`;
    if (membership) throw new ApiError(409, 'Your membership already includes this story.');
    const [prior] = await sql`SELECT 1 FROM access_grants WHERE story_id=${storyId} AND user_id=${buyerId} LIMIT 1`;
    let quote;
    try { quote = quoteStoryPurchase({ authorId: story.author_id, status: story.status, chaptersPublic: story.chapters_public, currency: story.currency, offeredDurations: story.offered_durations, wholePrices: story.whole_prices, chapters: story.chapters }, buyerId, body, !!prior); }
    catch (error) { if (error instanceof PaymentQuoteError) throw new ApiError(400, error.message); throw error; }
    if (quote.amountMinor <= 0 || quote.items.some(i => i.amountMajor > 2147483647)) throw new ApiError(400, 'Choose a positive, supported checkout price.');
    const grants = await sql`SELECT scope,chapter_index FROM access_grants WHERE story_id=${storyId} AND user_id=${buyerId} AND (expires_at IS NULL OR expires_at>now())`;
    if (grants.some(g => g.scope === 'whole') || quote.items.some(i => i.scope === 'chapter' && grants.some(g => g.chapter_index === i.chapterIndex))) throw new ApiError(409, 'You already have access to the selected content. Refresh this story.');
    // A zero platform fee is a sandbox-only default, not a live commission decision.
    await sql`INSERT INTO payment_orders(id,buyer_id,author_id,story_id,request_key,request_hash,mode,provider_account_id,story_title,currency,amount_minor,platform_fee_bps,items)
      VALUES (${randomUUID()},${buyerId},${story.author_id},${storyId},${body.requestKey},${hash},'test',${account.provider_id},${story.title},${quote.currency},${quote.amountMinor},0,${sql.json(quote.items)}) ON CONFLICT DO NOTHING`;
    [order] = await sql<PaymentOrder[]>`SELECT * FROM payment_orders WHERE buyer_id=${buyerId} AND request_key=${body.requestKey} AND mode='test'`;
    if (!order) [order] = await sql<PaymentOrder[]>`SELECT * FROM payment_orders WHERE buyer_id=${buyerId} AND story_id=${storyId} AND request_hash=${hash} AND mode='test' AND status IN ('created','checkout_open')`;
  }
  if (!order || order.request_hash !== hash || order.story_id !== storyId) throw new ApiError(409, 'That checkout reference belongs to another selection.');
  if (order.status === 'paid') return { orderId: order.id, checkoutUrl: `${walletOrigin()}/payments/return?order=${order.id}` };
  if (order.status === 'expired' || (!order.checkout_session_id && Date.now()-new Date(order.created_at).getTime() >= 23*3600_000)) throw new ApiError(409, 'This checkout has expired or needs review. Start a new checkout.');
  if (order.checkout_session_id) {
    const existing = await stripe.checkout.sessions.retrieve(order.checkout_session_id, {}, { stripeAccount: order.provider_account_id });
    if (existing.status === 'expired') { await sql`UPDATE payment_orders SET status='expired' WHERE id=${order.id} AND status='checkout_open'`; throw new ApiError(409, 'This checkout has expired. Start a new checkout.'); }
    if (existing.status === 'complete') return { orderId: order.id, checkoutUrl: `${walletOrigin()}/payments/return?order=${order.id}` };
    return { orderId: order.id, checkoutUrl: secureCheckoutUrl(existing.url) };
  }
  const readiness = await stripe.accounts.retrieve(order.provider_account_id);
  if (readiness.deleted || !order.author_id) throw new ApiError(409, 'Author payments are unavailable.');
  const input = buildStoryCheckout({ orderId: order.id, authorId: order.author_id!, title: order.story_title, currency: order.currency, amountMinor: Number(order.amount_minor), items: order.items, origin: walletOrigin(), platformFeeBps: order.platform_fee_bps,
    account: { id: order.provider_account_id, authorId: order.author_id!, country: readiness.country || '', chargesEnabled: !!readiness.charges_enabled, payoutsEnabled: !!readiness.payouts_enabled }, approvedCountries: approvedCountries() });
  const session = await stripe.checkout.sessions.create(input.params, input.options);
  if (session.livemode || session.amount_total !== Number(order.amount_minor) || session.currency !== order.currency.toLowerCase()) throw new ApiError(503, 'Stripe checkout details did not match the order.');
  const rows = await sql`UPDATE payment_orders SET checkout_session_id=${session.id},status=CASE WHEN status='created' THEN 'checkout_open' ELSE status END WHERE id=${order.id} AND (checkout_session_id IS NULL OR checkout_session_id=${session.id}) RETURNING id`;
  if (!rows.length) throw new ApiError(409, 'Checkout changed. Refresh your payment status.');
  return { orderId: order.id, checkoutUrl: secureCheckoutUrl(session.url) };
}
function secureCheckoutUrl(value: string | null) {
  if (!value) throw new ApiError(503, 'Stripe checkout is unavailable.');
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.hostname !== 'checkout.stripe.com') throw new ApiError(503, 'Unable to open secure Stripe checkout.');
  return url.href;
}

export function assertPaidOrder(order: PaymentOrder, session: Stripe.Checkout.Session, intent: Stripe.PaymentIntent) {
  if (session.livemode !== (order.mode === 'live') || session.id !== order.checkout_session_id || session.mode !== 'payment' || session.status !== 'complete' || session.payment_status !== 'paid' || session.amount_total !== Number(order.amount_minor) || session.currency !== order.currency.toLowerCase() || session.client_reference_id !== order.id || session.metadata?.talerooms_order_id !== order.id || intent.livemode !== session.livemode || intent.status !== 'succeeded' || intent.amount_received !== Number(order.amount_minor) || intent.currency !== order.currency.toLowerCase() || intent.metadata?.talerooms_order_id !== order.id || (typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id) !== intent.id) throw new ApiError(409, 'Verified payment does not match its order.');
}

// Called only after signature verification. Event bodies never directly grant access.
export async function fulfillCheckoutEvent(event: Stripe.Event) {
  sandbox();
  if (!event.account || event.livemode) throw new ApiError(400, 'A sandbox connected-account event is required.');
  const ref = (event.data.object as Stripe.Checkout.Session).id;
  if (!/^cs_test_[A-Za-z0-9]+$/.test(ref || '')) throw new ApiError(400, 'Invalid checkout reference.');
  const [order] = await sql<PaymentOrder[]>`SELECT * FROM payment_orders WHERE checkout_session_id=${ref} AND provider_account_id=${event.account} AND mode='test'`;
  if (!order) {
    // A completion that outruns session persistence must be retried, not dropped.
    const claimed = (event.data.object as Stripe.Checkout.Session).metadata?.talerooms_order_id;
    if (typeof claimed === 'string' && uuid.test(claimed)) {
      const [pending] = await sql`SELECT id FROM payment_orders WHERE id=${claimed} AND provider_account_id=${event.account} AND mode='test' AND checkout_session_id IS NULL`;
      if (pending) throw new ApiError(503, 'Checkout is still being recorded. Retry this event.');
    }
    return; // Not a checkout created by Talerooms.
  }
  const stripe = stripeClient();
  const session = await stripe.checkout.sessions.retrieve(ref, { expand: ['payment_intent'] }, { stripeAccount: order.provider_account_id });
  if (session.payment_status !== 'paid') {
    if (session.status === 'expired') await sql`UPDATE payment_orders SET status='expired' WHERE id=${order.id} AND status IN ('created','checkout_open')`;
    return;
  }
  const intent = session.payment_intent;
  if (!intent || typeof intent === 'string') throw new ApiError(503, 'Payment confirmation is still processing.');
  assertPaidOrder(order, session, intent);
  await sql.begin(async tx => {
    const [current] = await tx<PaymentOrder[]>`SELECT * FROM payment_orders WHERE id=${order.id} FOR UPDATE`;
    if (current.status === 'paid') { await tx`INSERT INTO payment_webhook_events(mode,event_id) VALUES ('test',${event.id}) ON CONFLICT DO NOTHING`; return; }
    if (current.buyer_id && current.story_id) for (const item of current.items) {
      await tx`INSERT INTO access_grants(story_id,user_id,scope,chapter_index,duration,amount,expires_at,payment_order_id)
        VALUES (${current.story_id},${current.buyer_id},${item.scope},${item.chapterIndex},${item.duration},${item.amountMajor},${expiryFor(item.duration)},${current.id}) ON CONFLICT DO NOTHING`;
    }
    await tx`UPDATE payment_orders SET status='paid',payment_intent_id=${intent.id},paid_at=now() WHERE id=${order.id}`;
    await tx`INSERT INTO payment_webhook_events(mode,event_id) VALUES ('test',${event.id}) ON CONFLICT DO NOTHING`;
  });
}
