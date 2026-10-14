import { sql } from '@/lib/db';
import { WalletError, type Account, type Withdrawal, type WalletStore } from './types';
function account(row: Record<string, unknown>): Account {
  return { id: String(row.id), userId: row.user_id as string | null, mode: row.mode as Account['mode'], country: String(row.country), providerId: row.provider_id as string | null, createdAt: new Date(row.created_at as string) };
}
function withdrawal(row: Record<string, unknown>): Withdrawal {
  const amount = Number(row.amount);
  if (!Number.isSafeInteger(amount)) throw new WalletError(503, 'Wallet amount exceeds the supported limit.');
  return { id: String(row.id), accountId: String(row.account_id), requestKey: String(row.request_key), amount, currency: String(row.currency), source: row.source_type as Withdrawal['source'], providerId: row.provider_id as string | null, status: row.status as Withdrawal['status'], createdAt: new Date(row.created_at as string), arrivalAt: row.arrival_at ? new Date(row.arrival_at as string) : null };
}
export const walletStore: WalletStore = {
  async account(userId, mode) {
    const [row] = await sql`SELECT * FROM author_payment_accounts WHERE user_id=${userId} AND mode=${mode}`;
    return row ? account(row) : null;
  },
  async ensureAccount(userId, mode, country) {
    const [row] = await sql`INSERT INTO author_payment_accounts(user_id,mode,country) VALUES (${userId},${mode},${country})
      ON CONFLICT(user_id,mode) DO UPDATE SET user_id=EXCLUDED.user_id RETURNING *`;
    const result = account(row);
    if (result.country !== country) throw new WalletError(409, 'Your payout country is already selected. Contact support to change it.');
    return result;
  },
  async setProvider(account, providerId) {
    const rows = await sql`UPDATE author_payment_accounts SET provider_id=${providerId} WHERE id=${account.id} AND user_id=${account.userId}
      AND (provider_id IS NULL OR provider_id=${providerId}) RETURNING id`;
    if (!rows.length) throw new WalletError(409, 'Payout account changed. Refresh your wallet.');
  },
  async withdrawals(account) {
    // Include every unresolved reservation, even when older than visible history.
    const rows = await sql`SELECT * FROM wallet_withdrawals WHERE account_id=${account.id}
      AND (status IN ('reserved','unknown') OR id IN (SELECT id FROM wallet_withdrawals WHERE account_id=${account.id} ORDER BY created_at DESC LIMIT 100)) ORDER BY created_at DESC`;
    return rows.map(withdrawal);
  },
  async findWithdrawal(account, payoutId, withdrawalId) {
    const [row] = await sql`SELECT * FROM wallet_withdrawals WHERE account_id=${account.id}
      AND (provider_id=${payoutId} OR id::text=${withdrawalId || ''}) LIMIT 1`;
    return row ? withdrawal(row) : null;
  },
  async reserve(account, key, check) {
    return await sql.begin(async tx => {
      await tx`SELECT pg_advisory_xact_lock(hashtextextended(${account.id},0))`;
      const rows = await tx`SELECT * FROM wallet_withdrawals WHERE account_id=${account.id}
        AND (created_at > now()-interval '1 hour' OR status IN ('reserved','unknown') OR request_key=${key}) ORDER BY created_at DESC`;
      const input = await check(rows.map(withdrawal));
      const [old] = rows.filter(row => row.request_key === key);
      if (old) return withdrawal(old);
      const [row] = await tx`INSERT INTO wallet_withdrawals(account_id,request_key,amount,currency,source_type,status)
        VALUES (${account.id},${key},${input.amount},${input.currency},${input.source},'reserved') RETURNING *`;
      return withdrawal(row);
    });
  },
  async savePayout(account, row, payout) {
    if (payout.amount !== row.amount || payout.currency !== row.currency || payout.withdrawalId !== row.id) throw new WalletError(409, 'Withdrawal reconciliation needs attention.');
    await sql`UPDATE wallet_withdrawals SET provider_id=${payout.id}, status=${payout.status}, arrival_at=${payout.arrivalAt}, updated_at=now()
      WHERE account_id=${account.id} AND id=${row.id} AND (provider_id IS NULL OR provider_id=${payout.id})
      AND (status NOT IN ('failed','canceled') OR status=${payout.status})
      AND (status <> 'paid' OR ${payout.status} IN ('paid','failed'))`;
  },
  async mark(account, row, status) {
    await sql`UPDATE wallet_withdrawals SET status=${status},updated_at=now() WHERE account_id=${account.id} AND id=${row.id} AND provider_id IS NULL AND status IN ('reserved','unknown')`;
  },
  async saveTransactions(account, rows) {
    await sql.begin(async tx => {
      for (const row of rows) await tx`INSERT INTO wallet_transactions(account_id,provider_id,currency,amount,fee,net,kind,status,occurred_at,available_at)
        VALUES (${account.id},${row.id},${row.currency},${row.amount},${row.fee},${row.net},${row.kind},${row.status},${row.occurredAt},${row.availableAt})
        ON CONFLICT(account_id,provider_id) DO UPDATE SET status=EXCLUDED.status,available_at=EXCLUDED.available_at`;
    });
  },
};
