import { requireSession, ApiError } from '@/lib/http';
import { sql } from '@/lib/db';
import { walletJson, walletRoute } from '@/lib/wallet/http';
import { limitWallet } from '@/lib/wallet/limits';
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return walletRoute(async () => {
    const session = await requireSession();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new ApiError(404, 'Order not found.');
    await limitWallet(session.user.id, 'read');
    const [order] = await sql`SELECT status FROM payment_orders WHERE id=${id} AND buyer_id=${session.user.id} AND mode=${process.env.STRIPE_MODE || 'test'}`;
    if (!order) throw new ApiError(404, 'Order not found.');
    return walletJson({ status: order.status });
  })(request);
}
