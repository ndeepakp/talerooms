import { afterAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { sql } from '@/lib/db';
import { walletStore } from './store';
import type { Account, Withdrawal } from './types';
// Explicit opt-in against the developer's local database. Financial fixtures
// are retained for audit; never run against a deployed database.
const enabled = process.env.WALLET_DB_TESTS === 'true';
afterAll(async () => { if (enabled) await sql.end(); });
describe.skipIf(!enabled)('wallet PostgreSQL concurrency and reconciliation', () => {
  it('serializes reservations across independent transactions and persists retries', async () => {
    const account: Account = { id: randomUUID(), userId: null, mode: 'test', country: 'SG', providerId: null, createdAt: new Date() };
    await sql`INSERT INTO author_payment_accounts(id,mode,country) VALUES (${account.id},'test','SG')`;
    const key = randomUUID();
    const check = (currentKey: string) => async (rows: Withdrawal[]) => {
      if (!rows.some(w => w.requestKey === currentKey) && rows.reduce((n,w) => n+w.amount,0) + 8000 > 10000) throw new Error('insufficient');
      return { amount: 8000, currency: 'sgd', source: 'card' as const };
    };
    const otherKey = randomUUID();
    const results = await Promise.allSettled([walletStore.reserve(account,key,check(key)),walletStore.reserve(account,otherKey,check(otherKey))]);
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    const original = (await walletStore.withdrawals(account))[0];
    const replay = await walletStore.reserve(account,original.requestKey, async () => ({ amount: 8000, currency: 'sgd', source: 'card' }));
    expect(replay.id).toBe(original.id);
    const payout = { id: 'po_fixture_'+randomUUID().replaceAll('-',''), amount: 8000, currency: 'sgd', status: 'paid' as const, arrivalAt: new Date(), withdrawalId: original.id };
    await walletStore.savePayout(account, original, payout);
    await walletStore.savePayout(account, original, { ...payout, status: 'pending' });
    expect((await walletStore.withdrawals(account))[0].status).toBe('paid');
    await walletStore.savePayout(account, original, { ...payout, status: 'failed' });
    expect((await walletStore.withdrawals(account))[0].status).toBe('failed');
    await walletStore.saveTransactions(account,[{id:'txn_fixture',currency:'sgd',amount:10000,fee:300,net:9700,kind:'charge',status:'pending',occurredAt:new Date(),availableAt:new Date()}]);
    await walletStore.saveTransactions(account,[{id:'txn_fixture',currency:'sgd',amount:10000,fee:300,net:9700,kind:'charge',status:'available',occurredAt:new Date(),availableAt:new Date()}]);
    const ledger = await sql`SELECT * FROM wallet_transactions WHERE account_id=${account.id}`;
    expect(ledger).toHaveLength(1); expect(ledger[0].status).toBe('available');
    await expect(walletStore.savePayout(account, original, { ...payout, amount: 1 })).rejects.toThrow('reconciliation');
  });
});
