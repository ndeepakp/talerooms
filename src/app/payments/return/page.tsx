import { notFound } from 'next/navigation';
import { requirePageSession } from '@/lib/account-session';
import { sql } from '@/lib/db';
import { PaymentStatus } from './PaymentStatus';
export default async function PaymentReturn({ searchParams }: { searchParams: Promise<{ order?: string; cancelled?: string }> }) {
  const session = await requirePageSession();
  const query = await searchParams;
  if (typeof query.order !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(query.order)) notFound();
  const [order] = await sql`SELECT p.id,p.status,p.currency,p.amount_minor,p.mode,p.story_title,p.items,p.story_id,s.slug FROM payment_orders p LEFT JOIN stories s ON s.id=p.story_id
    WHERE p.id=${query.order} AND p.buyer_id=${session.user.id} AND p.mode=${process.env.STRIPE_MODE || 'test'}`;
  if (!order) notFound();
  const chapter = order.items.find((i: { scope: string }) => i.scope === 'chapter')?.chapterIndex ?? 0;
  return <PaymentStatus key={order.id} order={{ id: order.id, status: order.status, title: order.story_title, amountMinor: Number(order.amount_minor), currency: order.currency, mode: order.mode, storyHref: order.story_id ? `/stories/${order.slug || order.story_id}?chapter=${chapter}#reading-room` : null }} cancelled={query.cancelled === '1'} />;
}
