export type Mode = 'test' | 'live';
export type Source = 'card' | 'bank_account' | 'fpx';
export type PayoutStatus = 'pending' | 'in_transit' | 'paid' | 'failed' | 'canceled';
export type Account = { id: string; userId: string | null; mode: Mode; country: string; providerId: string | null; createdAt: Date };
export type Withdrawal = { id: string; accountId: string; requestKey: string; amount: number; currency: string; source: Source; providerId: string | null; status: PayoutStatus | 'reserved' | 'unknown'; arrivalAt: Date | null; createdAt: Date };
export type Balance = { currency: string; amount: number; sources: Partial<Record<Source, number>> };
export type Transaction = { id: string; currency: string; amount: number; fee: number; net: number; kind: string; status: string; occurredAt: Date; availableAt: Date };
export type Payout = { id: string; amount: number; currency: string; status: PayoutStatus; arrivalAt: Date; withdrawalId?: string };
export type Snapshot = { country: string; chargesEnabled: boolean; payoutsEnabled: boolean; schedule: string; banks: { currency: string; label: string }[]; available: Balance[]; pending: Balance[]; transactions: Transaction[]; payouts: Payout[] };
export interface WalletProvider {
  createAccount(account: Account, email: string): Promise<string>;
  onboarding(account: Account, origin: string): Promise<string>;
  snapshot(account: Account): Promise<Snapshot>;
  payout(account: Account, withdrawal: Withdrawal): Promise<Payout>;
}
export class WalletError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export class ProviderRejection extends Error {}
export interface WalletStore {
  account(userId: string, mode: Mode): Promise<Account | null>;
  ensureAccount(userId: string, mode: Mode, country: string): Promise<Account>;
  setProvider(account: Account, providerId: string): Promise<void>;
  withdrawals(account: Account): Promise<Withdrawal[]>;
  findWithdrawal(account: Account, payoutId: string, withdrawalId?: string): Promise<Withdrawal | null>;
  // The callback executes while holding a cross-process account lock.
  reserve(account: Account, key: string, check: (rows: Withdrawal[]) => Promise<{ amount: number; currency: string; source: Source }>): Promise<Withdrawal>;
  savePayout(account: Account, row: Withdrawal, payout: Payout): Promise<void>;
  mark(account: Account, row: Withdrawal, status: 'unknown' | 'failed'): Promise<void>;
  saveTransactions(account: Account, rows: Transaction[]): Promise<void>;
}
