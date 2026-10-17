import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { WalletService } from './service';
import { ProviderRejection, type Account, type Withdrawal, type WalletStore, type WalletProvider, type Snapshot, type Payout } from './types';
import { parseAmount, configured, formatMoney } from './policy';

function fixture() {
  const account: Account = { id: randomUUID(), userId: 'author', mode: 'test', country: 'SG', providerId: 'acct_fixture', createdAt: new Date() };
  let rows: Withdrawal[] = [];
  let lock = Promise.resolve();
  let balance = 10000;
  let calls = 0;
  let fail: 'timeout' | 'decline' | null = null;
  const paid = new Map<string, Payout>();
  const snapshot: Snapshot = { country: 'SG', chargesEnabled: true, payoutsEnabled: true, schedule: 'weekly', banks: [{ currency: 'sgd', label: 'Test bank ···· 1234' }], available: [], pending: [{ currency: 'sgd', amount: 2000, sources: { card: 2000 } }], transactions: [], payouts: [] };
  const store: WalletStore = {
    async account(userId) { return userId === account.userId ? account : null; },
    async ensureAccount(userId, mode, country) { if (userId !== account.userId || country !== account.country) throw new Error('ownership/country'); return { ...account, mode }; },
    async setProvider(_, id) { account.providerId = id; },
    async withdrawals() { return structuredClone(rows); },
    async findWithdrawal(_, payoutId, withdrawalId) { return rows.find(w => w.providerId === payoutId || w.id === withdrawalId) || null; },
    async reserve(_, key, check) {
      const previous = lock;
      let release!: () => void;
      lock = new Promise<void>(resolve => { release = resolve; });
      await previous;
      try {
        const input = await check(structuredClone(rows));
        let row = rows.find(r => r.requestKey === key);
        if (!row) { row = { ...input, id: randomUUID(), accountId: account.id, requestKey: key, status: 'reserved', providerId: null, createdAt: new Date(), arrivalAt: null }; rows.push(row); }
        return structuredClone(row);
      } finally { release(); }
    },
    async savePayout(_, row, result) {
      if (result.withdrawalId !== row.id || result.amount !== row.amount || result.currency !== row.currency) throw new Error('reconciliation');
      Object.assign(rows.find(r => r.id === row.id)!, { status: result.status, providerId: result.id, arrivalAt: result.arrivalAt });
    },
    async mark(_, row, status) { const current = rows.find(r => r.id === row.id)!; if (!current.providerId) current.status = status; },
    async saveTransactions() {},
  };
  const provider: WalletProvider = {
    async createAccount() { return 'acct_fixture'; }, async onboarding() { return 'https://connect.stripe.com/fixture'; },
    async snapshot() { return { ...structuredClone(snapshot), available: [{ currency: 'sgd', amount: balance, sources: { card: balance } }], payouts: [...paid.values()] }; },
    async payout(_, row) {
      calls++;
      if (paid.has(row.requestKey)) return paid.get(row.requestKey)!;
      if (fail === 'decline') throw new ProviderRejection('Declined');
      const result: Payout = { id: 'po_' + row.id, amount: row.amount, currency: row.currency, status: 'pending', arrivalAt: new Date(Date.now() + 86400_000), withdrawalId: row.id };
      balance -= row.amount; paid.set(row.requestKey, result);
      if (fail === 'timeout') throw new Error('lost network response');
      return result;
    },
  };
  const service = new WalletService(store, provider, ['SG'], true);
  const input = (amount = '60') => ({ key: randomUUID(), amount, currency: 'sgd', source: 'card' });
  return { service, store, provider, account, snapshot, input, paid, rows: () => rows, replaceRows: (r: Withdrawal[]) => { rows = r; }, calls: () => calls, fail: (value: typeof fail) => { fail = value; } };
}
beforeEach(() => vi.stubEnv('STRIPE_MODE', 'test'));
afterEach(() => vi.unstubAllEnvs());
describe('wallet money and configuration', () => {
  it('uses exact minor units, including JPY', () => { expect(parseAmount('12.34', 'sgd')).toBe(1234); expect(parseAmount('1234', 'jpy')).toBe(1234); });
  it.each(['-1', '0', '1e4', '1.234', 'Infinity', '9007199254740992', ' 5', '1,000'])('rejects invalid amount %s', value => expect(() => parseAmount(value, 'sgd')).toThrow());
  it('does not guess minor units for unsupported currencies', () => { expect(formatMoney(1000, 'isk')).toBe('ISK — view in Stripe'); expect(() => parseAmount('1', 'constructor')).toThrow(); });
  it('rejects unsupported settlement currencies and JPY decimals', () => { expect(() => parseAmount('1', 'xxx')).toThrow(); expect(() => parseAmount('1.1', 'jpy')).toThrow(); });
  it('fails closed without an approved country, matching key and opt-in', () => { vi.stubEnv('STRIPE_WALLET_ENABLED', 'true'); vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_fixture'); vi.stubEnv('STRIPE_CONNECT_COUNTRIES', ''); expect(configured()).toBe(false); vi.stubEnv('STRIPE_CONNECT_COUNTRIES', 'SG'); expect(configured()).toBe(true); vi.stubEnv('STRIPE_SECRET_KEY', 'sk_live_fixture'); expect(configured()).toBe(false); });
});
describe('wallet ownership, balances and payout safety', () => {
  it('cannot access another author account', async () => { const f = fixture(); expect((await f.service.read('stranger')).snapshot).toBeNull(); await expect(f.service.withdraw('stranger', f.input())).rejects.toThrow('setup'); expect(f.calls()).toBe(0); });
  it('withdraws settled funds and records provider status', async () => { const f = fixture(); const row = await f.service.withdraw('author', f.input()); expect(row.status).toBe('pending'); expect((await f.service.read('author')).snapshot?.available[0].amount).toBe(4000); });
  it('pending earnings cannot fund withdrawals', async () => { const f = fixture(); await expect(f.service.withdraw('author', f.input('110'))).rejects.toThrow('available'); expect(f.calls()).toBe(0); });
  it('two concurrent requests cannot overspend the same balance', async () => { const f = fixture(); const results = await Promise.allSettled([f.service.withdraw('author', f.input('80')), f.service.withdraw('author', f.input('80'))]); expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1); expect(f.paid.size).toBe(1); });
  it('repeated request keys never create another payout, including concurrent clicks', async () => { const f = fixture(); const input = f.input(); await Promise.all([f.service.withdraw('author', input), f.service.withdraw('author', input)]); await f.service.withdraw('author', input); expect(f.paid.size).toBe(1); });
  it('a reused key with changed amount is rejected', async () => { const f = fixture(); const input = f.input(); await f.service.withdraw('author', input); await expect(f.service.withdraw('author', { ...input, amount: '10' })).rejects.toThrow('different'); });
  it('uncertain network response reserves funds and retries the same provider request', async () => { const f = fixture(); const input = f.input('80'); f.fail('timeout'); await expect(f.service.withdraw('author', input)).rejects.toThrow('checking'); expect(f.rows()[0].status).toBe('unknown'); await expect(f.service.withdraw('author', f.input('30'))).rejects.toThrow('available'); f.fail(null); const row = await f.service.withdraw('author', input); expect(row.status).toBe('pending'); expect(f.paid.size).toBe(1); });
  it('cannot retry an unresolved request after payout readiness is revoked', async () => { const f = fixture(); const input = f.input(); f.fail('timeout'); await expect(f.service.withdraw('author', input)).rejects.toThrow(); const before = f.calls(); f.snapshot.payoutsEnabled = false; await expect(f.service.withdraw('author', input)).rejects.toThrow('ready'); expect(f.calls()).toBe(before); });
  it('a refresh reconciles a lost response rather than creating money', async () => { const f = fixture(); f.fail('timeout'); await expect(f.service.withdraw('author', f.input())).rejects.toThrow(); const view = await f.service.read('author'); expect(view.withdrawals[0].status).toBe('pending'); expect(view.snapshot?.available[0].amount).toBe(4000); });
  it('definitive provider rejection releases its reservation', async () => { const f = fixture(); f.fail('decline'); await expect(f.service.withdraw('author', f.input())).rejects.toThrow('Declined'); expect(f.rows()[0].status).toBe('failed'); expect((await f.service.read('author')).snapshot?.available[0].amount).toBe(10000); });
  it('failed payout is reconciled from authoritative provider state', async () => { const f = fixture(); const input = f.input(); await f.service.withdraw('author', input); f.paid.get(input.key)!.status = 'failed'; expect((await f.service.read('author')).withdrawals[0].status).toBe('failed'); });
  it('requires supported country, payout capabilities and automatic fallback', async () => { for (const change of [{ country: 'US' }, { payoutsEnabled: false }, { chargesEnabled: false }, { schedule: 'manual' }, { schedule: 'monthly' }]) { const f = fixture(); Object.assign(f.snapshot, change); await expect(f.service.withdraw('author', f.input())).rejects.toThrow(); expect(f.calls()).toBe(0); } });
  it('requires an approved matching bank destination and payout controls', async () => { const f = fixture(); f.snapshot.banks = []; await expect(f.service.withdraw('author', f.input())).rejects.toThrow('bank'); expect(f.calls()).toBe(0); const g = fixture(); const blocked = new WalletService(g.store, g.provider, ['SG'], false); await expect(blocked.withdraw('author', g.input())).rejects.toThrow('controls'); });
  it('reconciles a delayed payout failure outside visible history by its provider reference', async () => {
    const f = fixture(); const input = f.input(); const row = await f.service.withdraw('author', input); f.paid.get(input.key)!.status = 'failed';
    await f.service.reconcilePayout('author', row.providerId!); expect(f.rows()[0].status).toBe('failed');
  });
  it('retains older ambiguous reservations and applies a request quota', async () => { const f = fixture(); f.replaceRows(Array.from({ length: 5 }, () => ({ id: randomUUID(), accountId: f.account.id, requestKey: randomUUID(), amount: 100, currency: 'sgd', source: 'card', providerId: null, status: 'unknown', arrivalAt: null, createdAt: new Date() }))); await expect(f.service.withdraw('author', f.input())).rejects.toThrow('Too many'); });
});

describe('onboarding retry and readiness transitions', () => {
  it('reuses the stored connected account when reopening or returning from onboarding', async () => {
    const f = fixture(); const create = vi.spyOn(f.provider, 'createAccount');
    await f.service.onboarding('author', 'author@example.test', 'SG', 'http://localhost:3000');
    await f.service.onboarding('author', 'author@example.test', 'SG', 'http://localhost:3000');
    expect(create).not.toHaveBeenCalled();
    f.snapshot.chargesEnabled = false; f.snapshot.payoutsEnabled = false;
    expect((await f.service.read('author')).canWithdraw).toBe(false);
    f.snapshot.chargesEnabled = true; expect((await f.service.read('author')).canWithdraw).toBe(false);
    f.snapshot.payoutsEnabled = true; expect((await f.service.read('author')).canWithdraw).toBe(true);
    f.snapshot.payoutsEnabled = false; expect((await f.service.read('author')).canWithdraw).toBe(false);
  });
  it('recovers a failed account creation using the same stored account reference', async () => {
    const f = fixture(); f.account.providerId = null;
    const create = vi.spyOn(f.provider, 'createAccount').mockRejectedValueOnce(new Error('Lost response')).mockResolvedValueOnce('acct_recovered');
    await expect(f.service.onboarding('author', 'author@example.test', 'SG', 'http://localhost:3000')).rejects.toThrow('Lost response');
    expect(f.account.providerId).toBeNull();
    await f.service.onboarding('author', 'author@example.test', 'SG', 'http://localhost:3000');
    expect(create.mock.calls[0][0].id).toBe(create.mock.calls[1][0].id); expect(f.account.providerId).toBe('acct_recovered');
  });
  it('never blindly recreates an account after the provider idempotency window', async () => {
    const f = fixture(); f.account.providerId = null; f.account.createdAt = new Date(Date.now() - 24*3600_000);
    const create = vi.spyOn(f.provider, 'createAccount');
    await expect(f.service.onboarding('author', 'author@example.test', 'SG', 'http://localhost:3000')).rejects.toThrow('reconciliation'); expect(create).not.toHaveBeenCalled();
  });
});
