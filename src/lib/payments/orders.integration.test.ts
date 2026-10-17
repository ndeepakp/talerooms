import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import postgres from 'postgres';
import Stripe from 'stripe';
import { randomUUID } from 'node:crypto';
const state = vi.hoisted(() => ({ tx: null as unknown as postgres.TransactionSql, account: '', walletId: '', session: null as unknown as Stripe.Checkout.Session, create: vi.fn(), retrieve: vi.fn() }));
vi.mock('@/lib/db', () => ({ sql: Object.assign((...args: unknown[]) => Reflect.apply(state.tx,undefined,args), { begin: (fn: (tx: postgres.TransactionSql) => Promise<unknown>) => state.tx.savepoint(fn), json: (value: never) => state.tx.json(value) }) }));
vi.mock('@/lib/http', () => ({ ApiError: class ApiError extends Error { name = 'ApiError'; constructor(public status: number, message: string) { super(message); } }, requireSession: vi.fn() }));
vi.mock('@/lib/account-session', () => ({ sessionAccountState: vi.fn() }));
vi.mock('@/lib/payments/stripe', async original => ({ ...await original<typeof import('@/lib/payments/stripe')>(), stripeClient: () => ({ accounts: { retrieve: async () => ({ country: 'SG', charges_enabled: true, payouts_enabled: true }) }, v2: { core: { accounts: { retrieve: async () => ({ livemode: false, metadata: { talerooms_account_id: state.walletId } }) } } }, checkout: { sessions: { create: state.create, retrieve: state.retrieve } } }) }));
import { startStripeCheckout } from './orders';
import { POST as webhook } from '@/app/api/wallet/webhook/route';
const enabled = process.env.PAYMENTS_DB_TESTS === 'true';
if (enabled && !['localhost','127.0.0.1','[::1]'].includes(new URL(process.env.DATABASE_URL!).hostname)) throw new Error('Checkout DB tests require a local database.');
const db = postgres(process.env.DATABASE_URL!, { max: 1 });
const sentinel = new Error('rollback checkout fixture');
const secret = 'whsec_checkout_fixture'; const sdk = new Stripe('sk_test_fixture');
beforeEach(() => {
  vi.stubEnv('STRIPE_MODE','test'); vi.stubEnv('STRIPE_SECRET_KEY','sk_test_fixture'); vi.stubEnv('STRIPE_WEBHOOK_SECRET',secret); vi.stubEnv('STRIPE_CONNECT_COUNTRIES','SG'); vi.stubEnv('BETTER_AUTH_URL','http://localhost:3000');
  state.create.mockReset().mockImplementation(async (params: Stripe.Checkout.SessionCreateParams) => {
    state.session = { id: 'cs_test_' + randomUUID().replaceAll('-',''), livemode: false, mode: 'payment', status: 'open', payment_status: 'unpaid', amount_total: 200, currency: 'sgd', url: 'https://checkout.stripe.com/c/pay/test', metadata: params.metadata, client_reference_id: params.client_reference_id } as Stripe.Checkout.Session;
    return state.session;
  });
  state.retrieve.mockReset().mockImplementation(async () => structuredClone(state.session));
});
afterEach(() => vi.unstubAllEnvs()); afterAll(async () => db.end());
async function fixture(test: (ids: { author: string; buyer: string; story: string }, tx: postgres.TransactionSql) => Promise<void>) {
  try { await db.begin(async tx => {
    state.tx = tx; const author=randomUUID(),buyer=randomUUID(),story=randomUUID(); state.account='acct_'+randomUUID().replaceAll('-','');state.walletId=randomUUID();
    for (const id of [author,buyer]) await tx`INSERT INTO "user"(id,name,email,"emailVerified","createdAt","updatedAt") VALUES (${id},'Checkout fixture',${id+'@example.test'},true,now(),now())`;
    await tx`INSERT INTO author_payment_accounts(id,user_id,mode,country,provider_id) VALUES (${state.walletId},${author},'test','SG',${state.account})`;
    await tx`INSERT INTO stories(id,author_id,title,body,excerpt,summary,status,chapters_public,offered_durations,whole_prices,chapters,currency) VALUES (${story},${author},'SGD checkout fixture','','','Fixture','published',false,${['always']},${tx.json({always:2})},${tx.json([{title:'Paid chapter',body:'<p>Locked until confirmed</p>',prices:{always:2}}])},'SGD')`;
    await test({author,buyer,story},tx);throw sentinel;
  }); }catch(e){if(e!==sentinel)throw e;}
}
function signedEvent(order: string) {
  const payload=JSON.stringify({id:'evt_'+randomUUID().replaceAll('-',''),type:'checkout.session.completed',livemode:false,account:state.account,data:{object:{id:state.session.id,metadata:{talerooms_order_id:order}}}});
  return () => new Request('http://localhost:3000/api/wallet/webhook',{method:'POST',headers:{'stripe-signature':sdk.webhooks.generateTestHeaderString({payload,secret})},body:payload});
}
function confirm(order: string) { state.session.status='complete';state.session.payment_status='paid';state.session.payment_intent={id:'pi_fixture',livemode:false,status:'succeeded',amount_received:200,currency:'sgd',metadata:{talerooms_order_id:order}} as unknown as Stripe.PaymentIntent; }
describe.skipIf(!enabled)('checkout order persistence and actual webhook transaction (simulated provider responses, not provider E2E)', () => {
  it('persists server-priced order, reuses checkout, and grants once only after verified payment',async()=>fixture(async({buyer,story},tx)=>{
    const input={requestKey:randomUUID(),scope:'chapters',duration:'always',chapterIndexes:[0],amount:1,currency:'USD'};
    const result=await startStripeCheckout(story,buyer,input);await startStripeCheckout(story,buyer,input);
    expect((await startStripeCheckout(story,buyer,{...input,requestKey:randomUUID()})).orderId).toBe(result.orderId);
    expect(state.create).toHaveBeenCalledTimes(1);expect(state.create.mock.calls[0][0].line_items[0].price_data.unit_amount).toBe(200);
    expect(await tx`SELECT * FROM access_grants WHERE story_id=${story}`).toHaveLength(0);
    confirm(result.orderId);const req=signedEvent(result.orderId);expect((await webhook(req())).status).toBe(200);expect((await webhook(req())).status).toBe(200);
    const grants=await tx`SELECT * FROM access_grants WHERE payment_order_id=${result.orderId}`;expect(grants).toHaveLength(1);expect(grants[0].user_id).toBe(buyer);expect(grants[0].amount).toBe(2);expect(grants[0].chapter_index).toBe(0);
    const [order]=await tx`SELECT * FROM payment_orders WHERE id=${result.orderId}`;expect(order.status).toBe('paid');expect(order.payment_intent_id).toBe('pi_fixture');
  }));
  it('does not unlock on unpaid, mismatched or redirected checkout, and remains retryable',async()=>fixture(async({buyer,story},tx)=>{
    const result=await startStripeCheckout(story,buyer,{requestKey:randomUUID(),scope:'whole',duration:'always'});const req=signedEvent(result.orderId);
    expect((await webhook(req())).status).toBe(200);expect(await tx`SELECT * FROM access_grants WHERE story_id=${story}`).toHaveLength(0);
    confirm(result.orderId);state.session.amount_total=1;expect((await webhook(req())).status).toBe(409);expect(await tx`SELECT * FROM access_grants WHERE story_id=${story}`).toHaveLength(0);
    state.session.amount_total=200;expect((await webhook(req())).status).toBe(200);expect(await tx`SELECT * FROM access_grants WHERE story_id=${story}`).toHaveLength(1);
  }));
  it('rejects basket changes on a reused checkout reference without another provider session',async()=>fixture(async({buyer,story})=>{
    const input={requestKey:randomUUID(),scope:'whole',duration:'always'};await startStripeCheckout(story,buyer,input);
    await expect(startStripeCheckout(story,buyer,{...input,scope:'chapters',chapterIndexes:[0]})).rejects.toThrow('another selection');expect(state.create).toHaveBeenCalledTimes(1);
  }));
});
