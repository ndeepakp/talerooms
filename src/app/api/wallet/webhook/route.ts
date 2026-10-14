import type Stripe from 'stripe';
import { sql } from '@/lib/db';
import { verifyStripeEvent } from '@/lib/payments/stripe';
import { walletJson, walletRoute, service } from '@/lib/wallet/http';
import { walletMode } from '@/lib/wallet/policy';
import { WalletError } from '@/lib/wallet/types';
import { limitedText } from '@/lib/wallet/limits';
export const POST = walletRoute(async request => {
  const payload = await limitedText(request, 262144);
  if (payload.length > 262144) throw new WalletError(413, 'Event is too large.');
  let event;
  try { event = verifyStripeEvent(payload, request.headers.get('stripe-signature') || ''); }
  catch { throw new WalletError(400, 'Invalid event signature.'); }
  if (!['payout.created', 'payout.updated', 'payout.paid', 'payout.failed', 'payout.canceled', 'account.updated', 'balance.available'].includes(event.type)) return walletJson({ received: true });
  if (!event.account) throw new WalletError(400, 'A connected-account event is required.');
  const mode = walletMode();
  const [seen] = await sql`SELECT event_id FROM wallet_webhook_events WHERE mode=${mode} AND event_id=${event.id}`;
  if (seen) return walletJson({ received: true });
  const [account] = await sql`SELECT user_id FROM author_payment_accounts WHERE mode=${mode} AND provider_id=${event.account}`;
  // Re-fetch the provider state; stale/out-of-order event bodies never credit money.
  if (account?.user_id) {
    const wallet = service();
    if (event.type.startsWith('payout.')) {
      const payout = event.data.object as Stripe.Payout;
      if (!/^po_[A-Za-z0-9]+$/.test(payout.id)) throw new WalletError(400, 'Invalid payout reference.');
      await wallet.reconcilePayout(account.user_id, payout.id, payout.metadata?.talerooms_withdrawal_id);
    }
    await wallet.read(account.user_id);
  }
  await sql`INSERT INTO wallet_webhook_events(mode,event_id) VALUES (${mode},${event.id}) ON CONFLICT DO NOTHING`;
  return walletJson({ received: true });
});
