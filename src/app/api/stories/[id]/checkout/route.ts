import { mutation, walletJson, walletRoute } from '@/lib/wallet/http';
import { limitWallet } from '@/lib/wallet/limits';
import { startStripeCheckout } from '@/lib/payments/orders';
import { stripeCheckoutEnabled } from '@/lib/payments/checkout-config';
import { ApiError } from '@/lib/http';
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return walletRoute(async req => {
    if (!stripeCheckoutEnabled()) throw new ApiError(503, 'Stripe checkout is not enabled.');
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new ApiError(404, 'Story not found.');
    const { session, body } = await mutation(req);
    await limitWallet(session.user.id, 'checkout');
    return walletJson(await startStripeCheckout(id, session.user.id, body));
  })(request);
}
