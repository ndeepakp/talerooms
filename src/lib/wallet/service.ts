import { approvedCountries, configured, parseAmount, requestKey, sourceType, supportedCurrency, walletMode } from './policy';
import { ProviderRejection, WalletError, type Account, type WalletProvider, type WalletStore, type Withdrawal, type Snapshot } from './types';
export class WalletService {
  constructor(private store: WalletStore, private provider: WalletProvider, private countries: string[] = approvedCountries(), private controls = process.env.STRIPE_PAYOUT_CONTROLS_ENABLED === 'true') {}
  private async account(userId: string): Promise<Account> {
    const account = await this.store.account(userId, walletMode());
    if (!account?.providerId || account.userId !== userId) throw new WalletError(409, 'Complete payout setup first.');
    return account;
  }
  private ready(account: Account, snapshot: Snapshot) {
    if (!this.countries.includes(account.country) || snapshot.country !== account.country || !snapshot.chargesEnabled || !snapshot.payoutsEnabled) throw new WalletError(409, 'Your payout account is not ready. Check identity and bank setup.');
    if (!this.controls || !['daily', 'weekly'].includes(snapshot.schedule)) throw new WalletError(409, 'Withdrawals are unavailable until payout controls and automatic fallback are verified.');
  }
  async onboarding(userId: string, email: string, country: unknown, origin: string) {
    if (typeof country !== 'string' || !this.countries.includes(country)) throw new WalletError(400, 'Choose a supported payout country.');
    const account = await this.store.ensureAccount(userId, walletMode(), country);
    if (!account.providerId) {
      if (Date.now() - account.createdAt.getTime() >= 23 * 3600_000) throw new WalletError(409, 'Payout setup needs reconciliation. Contact support to continue.');
      account.providerId = await this.provider.createAccount(account, email);
      await this.store.setProvider(account, account.providerId);
    }
    return this.provider.onboarding(account, origin);
  }
  async reconcilePayout(userId: string, payoutId: string, withdrawalId?: string) {
    const account = await this.account(userId);
    const row = await this.store.findWithdrawal(account, payoutId, withdrawalId);
    if (row) await this.store.savePayout(account, row, await this.provider.payout(account, { ...row, providerId: payoutId }));
  }
  async read(userId: string) {
    const account = await this.store.account(userId, walletMode());
    if (!account?.providerId || account.userId !== userId) return { account: account ? { country: account.country } : null, snapshot: null, withdrawals: [], canWithdraw: false };
    const snapshot = await this.provider.snapshot(account);
    await this.store.saveTransactions(account, snapshot.transactions);
    const withdrawals = await this.store.withdrawals(account);
    for (const row of withdrawals) {
      const match = snapshot.payouts.find(p => p.withdrawalId === row.id);
      if (match) await this.store.savePayout(account, row, match);
      else if (row.providerId && ['pending', 'in_transit'].includes(row.status)) await this.store.savePayout(account, row, await this.provider.payout(account, row));
    }
    const updated = await this.store.withdrawals(account);
    // Unknown responses retain a conservative reservation. A later refresh or
    // retry reconciles it; a browser failure must never create spendable money.
    snapshot.available = snapshot.available.map(balance => ({ ...balance,
      amount: balance.amount < 0 ? balance.amount : Math.max(0, balance.amount - updated.filter(w => w.currency === balance.currency && ['reserved', 'unknown'].includes(w.status)).reduce((sum, w) => sum + w.amount, 0)),
      sources: Object.fromEntries(Object.entries(balance.sources).map(([source, amount]) => [source, Math.max(0, (amount || 0) - updated.filter(w => w.currency === balance.currency && w.source === source && ['reserved', 'unknown'].includes(w.status)).reduce((sum, w) => sum + w.amount, 0))])),
    }));
    let canWithdraw = true;
    try { this.ready(account, snapshot); } catch { canWithdraw = false; }
    return { account: { country: account.country }, snapshot, withdrawals: updated.slice(0, 100), canWithdraw };
  }
  async withdraw(userId: string, input: { key?: unknown; amount?: unknown; currency?: unknown; source?: unknown }) {
    const account = await this.account(userId);
    const key = requestKey(input.key);
    if (typeof input.currency !== 'string' || !supportedCurrency(input.currency)) throw new WalletError(400, 'Choose a supported currency.');
    const currency = input.currency;
    const amount = parseAmount(input.amount, currency);
    const source = sourceType(input.source);
    const row = await this.store.reserve(account, key, async rows => {
      const existing = rows.find(w => w.requestKey === key);
      if (existing) {
        if (existing.amount !== amount || existing.currency !== currency || existing.source !== source) throw new WalletError(409, 'This request reference was already used for a different withdrawal.');
        if (['reserved', 'unknown'].includes(existing.status)) this.ready(account, await this.provider.snapshot(account));
        return { amount, currency, source };
      }
      if (rows.filter(w => Date.now() - w.createdAt.getTime() < 3600_000).length >= 5) throw new WalletError(429, 'Too many withdrawal requests. Try again later.');
      const snapshot = await this.provider.snapshot(account);
      this.ready(account, snapshot);
      if (!snapshot.banks.some(bank => bank.currency === currency)) throw new WalletError(409, 'Add a bank account for this currency through Stripe.');
      const balance = snapshot.available.find(b => b.currency === currency);
      const held = rows.filter(w => w.currency === currency && ['reserved', 'unknown'].includes(w.status));
      const totalHeld = held.reduce((sum, w) => sum + w.amount, 0);
      const sourceHeld = held.filter(w => w.source === source).reduce((sum, w) => sum + w.amount, 0);
      if (!balance || amount > balance.amount - totalHeld || amount > (balance.sources[source] || 0) - sourceHeld) throw new WalletError(409, 'That amount is not available to withdraw. Refresh your balance.');
      return { amount, currency, source };
    });
    if (['paid', 'failed', 'canceled', 'pending', 'in_transit'].includes(row.status)) return row;
    return this.submit(account, row);
  }
  private async submit(account: Account, row: Withdrawal) {
    try {
      const payout = await this.provider.payout(account, row);
      await this.store.savePayout(account, row, payout);
      return { ...row, providerId: payout.id, status: payout.status, arrivalAt: payout.arrivalAt };
    } catch (error) {
      if (error instanceof ProviderRejection) {
        await this.store.mark(account, row, 'failed');
        throw new WalletError(409, error.message);
      }
      await this.store.mark(account, row, 'unknown');
      if (error instanceof WalletError) throw error;
      throw new WalletError(503, 'We are checking this withdrawal. Retry the same request or refresh; do not create another withdrawal.');
    }
  }
}
export function walletConfiguration() {
  return { configured: configured(), mode: walletMode(), countries: approvedCountries() };
}
