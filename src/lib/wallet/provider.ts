import Stripe from 'stripe';
import { stripeClient } from '@/lib/payments/stripe';
import { ProviderRejection, WalletError, type WalletProvider, type Payout } from './types';
function payout(row: Stripe.Payout): Payout {
  if (!['pending', 'in_transit', 'paid', 'failed', 'canceled'].includes(row.status)) throw new WalletError(503, 'Unrecognized payout status.');
  return { id: row.id, amount: row.amount, currency: row.currency, status: row.status as Payout['status'], arrivalAt: new Date(row.arrival_date * 1000), withdrawalId: row.metadata?.talerooms_withdrawal_id };
}
export function stripeWalletProvider(): WalletProvider {
  const stripe = stripeClient();
  return {
    async createAccount(account, email) {
      const result = await stripe.v2.core.accounts.create({
        contact_email: email, identity: { country: account.country }, dashboard: 'full',
        defaults: { responsibilities: { fees_collector: 'stripe', losses_collector: 'stripe' } },
        configuration: { merchant: { capabilities: { card_payments: { requested: true } } } },
        metadata: { talerooms_account_id: account.id },
      }, { idempotencyKey: `wallet-account:${account.id}` });
      if (result.livemode !== (account.mode === 'live')) throw new WalletError(503, 'Payout account mode does not match.');
      return result.id;
    },
    async onboarding(account, origin) {
      const result = await stripe.v2.core.accountLinks.create({ account: account.providerId!, use_case: {
        type: 'account_onboarding', account_onboarding: { refresh_url: `${origin}/wallet?setup=refresh`, return_url: `${origin}/wallet?setup=return` },
      } });
      const url = new URL(result.url);
      if (url.protocol !== 'https:' || !(url.hostname === 'stripe.com' || url.hostname.endsWith('.stripe.com'))) throw new WalletError(503, 'Unable to open secure payout setup.');
      return result.url;
    },
    async snapshot(account) {
      const options = { stripeAccount: account.providerId! };
      const [details, balance, settings, transactions, payouts, banks] = await Promise.all([
        stripe.accounts.retrieve(account.providerId!), stripe.balance.retrieve({}, options),
        stripe.balanceSettings.retrieve({}, options), stripe.balanceTransactions.list({ limit: 100 }, options),
        stripe.payouts.list({ limit: 100 }, options),
        stripe.accounts.listExternalAccounts(account.providerId!, { object: 'bank_account', limit: 100 }),
      ]);
      if (details.deleted) throw new WalletError(409, 'Payout account is no longer available.');
      if (balance.livemode !== (account.mode === 'live')) throw new WalletError(503, 'Wallet mode does not match.');
      return {
        country: details.country || '', chargesEnabled: !!details.charges_enabled, payoutsEnabled: !!details.payouts_enabled,
        schedule: settings.payments?.payouts?.schedule?.interval || 'unknown',
        banks: banks.data.filter(bank => bank.object === 'bank_account' && bank.default_for_currency).map(bank => {
          const value = bank as Stripe.BankAccount;
          return { currency: value.currency, label: `${value.bank_name || 'Bank account'} ···· ${value.last4}` };
        }),
        available: balance.available.map(row => ({ currency: row.currency, amount: row.amount, sources: row.source_types || {} })),
        pending: balance.pending.map(row => ({ currency: row.currency, amount: row.amount, sources: row.source_types || {} })),
        transactions: transactions.data.map(row => ({ id: row.id, currency: row.currency, amount: row.amount, fee: row.fee, net: row.net, kind: row.type, status: row.status, occurredAt: new Date(row.created * 1000), availableAt: new Date(row.available_on * 1000) })),
        payouts: payouts.data.map(payout),
      };
    },
    async payout(account, row) {
      const options = { stripeAccount: account.providerId! };
      if (row.providerId) return payout(await stripe.payouts.retrieve(row.providerId, {}, options));
      // Stripe expires idempotency keys after 24h. Never recreate an ambiguous
      // request after that window; locate its original payout or hold for review.
      if (Date.now() - row.createdAt.getTime() >= 23 * 3600_000) {
        for await (const found of stripe.payouts.list({ limit: 100, created: { gte: Math.floor(row.createdAt.getTime() / 1000) - 60 } }, options)) {
          if (found.metadata?.talerooms_withdrawal_id === row.id) return payout(found);
        }
        throw new WalletError(409, 'This withdrawal needs reconciliation. Contact support; do not submit it again.');
      }
      try {
        return payout(await stripe.payouts.create({ amount: row.amount, currency: row.currency, source_type: row.source, method: 'standard',
          metadata: { talerooms_withdrawal_id: row.id } }, {
          ...options, idempotencyKey: `wallet-withdrawal:${account.id}:${row.requestKey}`,
        }));
      } catch (error) {
        if (error instanceof Stripe.errors.StripeInvalidRequestError || error instanceof Stripe.errors.StripePermissionError || error instanceof Stripe.errors.StripeAuthenticationError) throw new ProviderRejection('The bank withdrawal was declined. Refresh your wallet and check payout setup.');
        throw error;
      }
    },
  };
}
