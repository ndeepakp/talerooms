import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import postgres from 'postgres';
import Stripe from 'stripe';
import { randomUUID } from 'node:crypto';
const state = vi.hoisted(() => ({ tx: null as unknown as postgres.TransactionSql, read: vi.fn(), reconcile: vi.fn() }));
vi.mock('@/lib/db', () => ({ sql: (...args: unknown[]) => Reflect.apply(state.tx, undefined, args) }));
vi.mock('@/lib/http', () => ({ requireSession: vi.fn() }));
vi.mock('@/lib/account-session', () => ({ sessionAccountState: vi.fn() }));
vi.mock('@/lib/wallet/http', async original => ({ ...await original<typeof import('@/lib/wallet/http')>(), service: () => ({ read: state.read, reconcilePayout: state.reconcile }) }));
import { POST } from '@/app/api/wallet/webhook/route';
const enabled = process.env.WALLET_DB_TESTS === 'true';
if (enabled && !['localhost', '127.0.0.1', '[::1]'].includes(new URL(process.env.DATABASE_URL!).hostname)) throw new Error('Wallet DB tests require a local database.');
const db = postgres(process.env.DATABASE_URL!, { max: 1 });
const stripe = new Stripe('sk_test_fixture');
const secret = 'whsec_webhook_fixture';
const rollback = new Error('rollback successful webhook fixture');
beforeEach(() => { vi.stubEnv('STRIPE_MODE', 'test'); vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_fixture'); vi.stubEnv('STRIPE_WEBHOOK_SECRET', secret); state.read.mockReset().mockResolvedValue({}); state.reconcile.mockReset().mockResolvedValue(undefined); });
afterEach(() => vi.unstubAllEnvs());
afterAll(async () => db.end());
async function fixture(test: (ids: { user: string; account: string }, tx: postgres.TransactionSql) => Promise<void>) {
  try { await db.begin(async tx => {
    state.tx = tx;
    const user = randomUUID(); const account = 'acct_' + randomUUID().replaceAll('-', '');
    await tx`INSERT INTO "user"(id,name,email,"emailVerified","createdAt","updatedAt") VALUES (${user},'Webhook fixture',${user + '@example.test'},true,now(),now())`;
    await tx`INSERT INTO author_payment_accounts(user_id,mode,country,provider_id) VALUES (${user},'test','SG',${account})`;
    await test({ user, account }, tx); throw rollback;
  }); } catch (error) { if (error !== rollback) throw error; }
}
function request(event: object, options: { secret?: string; expired?: boolean; tamper?: boolean } = {}) {
  const payload = JSON.stringify(event);
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: options.secret || secret, ...(options.expired ? { timestamp: Math.floor(Date.now()/1000) - 600 } : {}) });
  return new Request('http://localhost:3000/api/wallet/webhook', { method: 'POST', headers: { 'stripe-signature': signature }, body: payload + (options.tamper ? ' ' : '') });
}
const event = (account: string, extra = {}) => ({ id: 'evt_' + randomUUID().replaceAll('-', ''), type: 'account.updated', livemode: false, account, data: { object: { charges_enabled: true, payouts_enabled: true, user_id: 'attacker', balance: 99999999 } }, ...extra });
describe.skipIf(!enabled)('actual wallet webhook handler, signatures and PostgreSQL', () => {
  it('uses account ownership from storage, ignores claimed readiness and deduplicates replay', async () => fixture(async ({ user, account }, tx) => {
    const e = event(account);
    expect((await POST(request(e))).status).toBe(200);
    expect(state.read).toHaveBeenCalledExactlyOnceWith(user);
    expect((await POST(request(e))).status).toBe(200);
    expect(state.read).toHaveBeenCalledTimes(1);
    expect(await tx`SELECT * FROM wallet_webhook_events WHERE event_id=${e.id}`).toHaveLength(1);
    expect(await tx`SELECT * FROM wallet_transactions WHERE account_id IN (SELECT id FROM author_payment_accounts WHERE user_id=${user})`).toHaveLength(0);
  }));
  it('keeps failed provider reads retryable and hides provider details', async () => fixture(async ({ account }, tx) => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const e = event(account); state.read.mockRejectedValueOnce(new Error('sk_test_PRIVATE bank data'));
      const failed = await POST(request(e)); expect(failed.status).toBe(503); expect(JSON.stringify(await failed.json())).not.toContain('PRIVATE');
      expect(await tx`SELECT * FROM wallet_webhook_events WHERE event_id=${e.id}`).toHaveLength(0);
      expect((await POST(request(e))).status).toBe(200);
      expect(await tx`SELECT * FROM wallet_webhook_events WHERE event_id=${e.id}`).toHaveLength(1);
    } finally { log.mockRestore(); }
  }));
  it('rejects bad, modified, expired and cross-mode signatures before any reconciliation', async () => fixture(async ({ account }) => {
    for (const options of [{ secret: 'whsec_wrong' }, { tamper: true }, { expired: true }]) expect((await POST(request(event(account), options))).status).toBe(400);
    expect((await POST(request(event(account, { livemode: true })))).status).toBe(400);
    expect((await POST(request(event(account, { account: undefined })))).status).toBe(400);
    expect(state.read).not.toHaveBeenCalled(); expect(state.reconcile).not.toHaveBeenCalled();
  }));
  it('does not attach unknown accounts to an author or process unrelated checkout events', async () => fixture(async ({ account }) => {
    expect((await POST(request(event('acct_unknown')))).status).toBe(200);
    expect((await POST(request(event(account, { type: 'checkout.session.completed', data: { object: { id: 'cs_test_unrelated' } } })))).status).toBe(200);
    expect(state.read).not.toHaveBeenCalled(); expect(state.reconcile).not.toHaveBeenCalled();
  }));
  it('passes valid payout references only to the stored owner and rejects malformed references', async () => fixture(async ({ user, account }) => {
    const invalid = event(account, { type: 'payout.paid', data: { object: { id: 'not-a-payout' } } });
    expect((await POST(request(invalid))).status).toBe(400); expect(state.reconcile).not.toHaveBeenCalled();
    const valid = event(account, { type: 'payout.paid', data: { object: { id: 'po_fixture', metadata: { talerooms_withdrawal_id: 'withdrawal' } } } });
    expect((await POST(request(valid))).status).toBe(200); expect(state.reconcile).toHaveBeenCalledExactlyOnceWith(user, 'po_fixture', 'withdrawal');
  }));
});
