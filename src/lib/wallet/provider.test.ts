import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import Stripe from 'stripe';
const mock = vi.hoisted(() => ({ create: vi.fn(), retrieve: vi.fn(), list: vi.fn(), account: vi.fn(), link: vi.fn() }));
vi.mock('@/lib/payments/stripe', () => ({ stripeClient: () => ({ payouts: mock, v2: { core: { accounts: { create: mock.account }, accountLinks: { create: mock.link } } } }) }));
import { stripeWalletProvider } from './provider';
import type { Account, Withdrawal } from './types';
const account: Account = { id: randomUUID(), userId: 'author', providerId: 'acct_fixture', mode: 'test', country: 'SG', createdAt: new Date() };
const row = (): Withdrawal => ({ id: randomUUID(), accountId: account.id, amount: 1234, currency: 'sgd', source: 'card', status: 'reserved', providerId: null, requestKey: randomUUID(), arrivalAt: null, createdAt: new Date() });
const payout = (withdrawal: Withdrawal) => ({ id: 'po_fixture', amount: withdrawal.amount, currency: withdrawal.currency, status: 'pending', arrival_date: 1800000000, metadata: { talerooms_withdrawal_id: withdrawal.id } });
beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.restoreAllMocks());
describe('Stripe wallet adapter', () => {
  it('scopes bank withdrawals to the author and uses a stable request key', async () => {
    const withdrawal = row(); mock.create.mockResolvedValue(payout(withdrawal));
    const provider = stripeWalletProvider(); await provider.payout(account, withdrawal); await provider.payout(account, withdrawal);
    expect(mock.create).toHaveBeenCalledWith(expect.objectContaining({ amount: 1234, currency: 'sgd', source_type: 'card', method: 'standard', metadata: { talerooms_withdrawal_id: withdrawal.id } }), { stripeAccount: 'acct_fixture', idempotencyKey: `wallet-withdrawal:${account.id}:${withdrawal.requestKey}` });
    expect(mock.create.mock.calls[0]).toEqual(mock.create.mock.calls[1]);
  });
  it('never creates a second payout after Stripe idempotency expiry', async () => {
    const withdrawal = row(); withdrawal.createdAt = new Date(Date.now() - 24 * 3600_000);
    mock.list.mockReturnValue({ async *[Symbol.asyncIterator]() { yield payout(withdrawal); } });
    expect((await stripeWalletProvider().payout(account, withdrawal)).id).toBe('po_fixture'); expect(mock.create).not.toHaveBeenCalled();
  });
  it('holds an old ambiguous request for review when no original payout is found', async () => {
    const withdrawal = row(); withdrawal.createdAt = new Date(Date.now() - 24 * 3600_000);
    mock.list.mockReturnValue({ async *[Symbol.asyncIterator]() {} });
    await expect(stripeWalletProvider().payout(account, withdrawal)).rejects.toThrow('reconciliation'); expect(mock.create).not.toHaveBeenCalled();
  });
  it('reads a known payout instead of re-creating it', async () => {
    const withdrawal = row(); withdrawal.providerId = 'po_fixture'; mock.retrieve.mockResolvedValue(payout(withdrawal));
    await stripeWalletProvider().payout(account, withdrawal); expect(mock.retrieve).toHaveBeenCalledWith('po_fixture', {}, { stripeAccount: 'acct_fixture' }); expect(mock.create).not.toHaveBeenCalled();
  });
  it('distinguishes definitive rejection from ambiguous network failure', async () => {
    mock.create.mockRejectedValue(new Stripe.errors.StripeInvalidRequestError({ message: 'secret provider detail' }));
    await expect(stripeWalletProvider().payout(account, row())).rejects.toThrow('declined');
    mock.create.mockRejectedValue(new Stripe.errors.StripeConnectionError({ message: 'connection failed' }));
    await expect(stripeWalletProvider().payout(account, row())).rejects.toThrow('connection');
  });
  it('requests a full Stripe dashboard with Stripe fee/loss responsibilities', async () => {
    mock.account.mockResolvedValue({ id: 'acct_created', livemode: false }); await stripeWalletProvider().createAccount(account, 'author@example.test');
    expect(mock.account).toHaveBeenCalledWith(expect.objectContaining({ identity: { country: 'SG' }, dashboard: 'full', defaults: { responsibilities: { fees_collector: 'stripe', losses_collector: 'stripe' } } }), { idempotencyKey: `wallet-account:${account.id}` });
  });
  it('rejects account mode mismatch and untrusted onboarding destinations', async () => {
    mock.account.mockResolvedValue({ id: 'acct_wrong', livemode: true }); await expect(stripeWalletProvider().createAccount(account,'author@example.test')).rejects.toThrow('mode');
    mock.link.mockResolvedValue({ url: 'https://stripe.com.evil.example/redirect' }); await expect(stripeWalletProvider().onboarding(account,'http://localhost:3000')).rejects.toThrow('secure');
    mock.link.mockResolvedValue({ url: 'https://connect.stripe.com/setup' }); expect(await stripeWalletProvider().onboarding(account,'http://localhost:3000')).toBe('https://connect.stripe.com/setup');
  });
});
