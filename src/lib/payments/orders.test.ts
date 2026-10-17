import { describe, expect, it, vi } from 'vitest';
import type Stripe from 'stripe';
vi.mock('@/lib/http', () => ({ ApiError: class ApiError extends Error { constructor(public status: number, message: string) { super(message); } } }));
import { assertPaidOrder, purchaseFingerprint, type PaymentOrder } from './orders';
const order = { id: '00000000-0000-4000-8000-000000000001', checkout_session_id: 'cs_test_example', mode: 'test', amount_minor: '200', currency: 'SGD' } as PaymentOrder;
const intent = { id: 'pi_example', livemode: false, status: 'succeeded', amount_received: 200, currency: 'sgd', metadata: { talerooms_order_id: order.id } } as unknown as Stripe.PaymentIntent;
const session = { id: 'cs_test_example', livemode: false, mode: 'payment', status: 'complete', payment_status: 'paid', amount_total: 200, currency: 'sgd', client_reference_id: order.id, metadata: { talerooms_order_id: order.id }, payment_intent: intent } as unknown as Stripe.Checkout.Session;
describe('Stripe paid-order validation', () => {
  it('accepts exact provider-confirmed payment facts', () => expect(() => assertPaidOrder(order, session, intent)).not.toThrow());
  it.each([{ livemode: true }, { id: 'cs_test_other' }, { status: 'open' }, { payment_status: 'unpaid' }, { mode: 'subscription' }, { amount_total: 1 }, { currency: 'usd' }, { client_reference_id: 'another-order' }, { metadata: {} }, { payment_intent: 'pi_other' }])('rejects mismatched session %j', patch => expect(() => assertPaidOrder(order, { ...session, ...patch } as Stripe.Checkout.Session, intent)).toThrow());
  it.each([{ livemode: true }, { status: 'processing' }, { amount_received: 1 }, { currency: 'usd' }, { metadata: {} }, { id: 'pi_other' }])('rejects unconfirmed or mismatched intent %j', patch => expect(() => assertPaidOrder(order, session, { ...intent, ...patch } as Stripe.PaymentIntent)).toThrow());
  it('does not let client-supplied prices or author IDs change checkout identity', () => {
    const base = { scope: 'chapters', duration: '1h', chapterIndexes: [1,0] };
    expect(purchaseFingerprint('story', base)).toBe(purchaseFingerprint('story', { ...base, chapterIndexes: [0,1], amount: 1, authorId: 'attacker' }));
    expect(purchaseFingerprint('story', base)).not.toBe(purchaseFingerprint('other', base));
    expect(purchaseFingerprint('story', base)).not.toBe(purchaseFingerprint('story', { ...base, duration: 'always' }));
  });
});
