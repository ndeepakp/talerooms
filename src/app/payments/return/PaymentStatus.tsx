'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { formatMoney } from '@/lib/wallet/money';
type Order = { id: string; status: string; title: string; amountMinor: number; currency: string; mode: string; storyHref: string | null };
export function PaymentStatus({ order, cancelled }: { order: Order; cancelled: boolean }) {
  const [status, setStatus] = useState(order.status);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (['paid', 'expired'].includes(status) || cancelled) return;
    let active = true; let attempts = 0; let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    async function check() {
      try {
        const r = await fetch(`/api/payments/orders/${order.id}`, { cache: 'no-store', signal: controller.signal });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || 'Unable to check this payment.');
        if (!active) return;
        setStatus(data.status); setError('');
        if (!['paid', 'expired'].includes(data.status) && ++attempts < 12) timer = setTimeout(check, 2500);
      } catch (e) { if (active) setError(e instanceof Error ? e.message : 'Unable to check this payment.'); }
    }
    void check(); return () => { active = false; controller.abort(); clearTimeout(timer); };
  }, [order.id, cancelled, retry, status]);
  const paid = status === 'paid';
  return <main className="mx-auto max-w-xl px-5 py-12 sm:py-20">
    <p className="text-sm font-medium text-muted">{order.mode === 'test' ? 'Stripe sandbox · No real money' : 'Your purchase'}</p>
    <h1 className="mt-4 font-serif text-4xl text-ink">{paid ? 'Payment confirmed' : status === 'expired' ? 'Checkout expired' : cancelled ? 'Checkout not completed' : 'Confirming your payment'}</h1>
    <p className="mt-5 break-words text-xl text-ink">{order.title}</p><p className="mt-2 text-muted">{formatMoney(order.amountMinor, order.currency.toLowerCase())}</p>
    <p role="status" className="mt-6 leading-relaxed text-ink-soft">{paid ? order.storyHref ? 'Stripe has confirmed your payment. Your purchased chapters are ready.' : 'Payment confirmed. This story is no longer available; contact support about this order.' : cancelled ? 'Returning here does not charge you or unlock chapters. Check your order status if you completed payment in another tab.' : status === 'expired' ? 'Return to the story to start a new checkout.' : 'Access opens only after the server verifies Stripe’s payment confirmation. You can safely refresh this page; do not pay again while confirmation is pending.'}</p>
    {error && <p role="alert" className="mt-4 text-danger">{error}</p>}
    <div className="mt-8 flex flex-wrap gap-3">{order.storyHref && <Link href={order.storyHref} className="btn-primary inline-flex min-h-12 items-center rounded-full px-6 py-3">{paid ? 'Read your chapters' : 'Back to story'}</Link>}{!paid && <button className="min-h-12 rounded-full border border-ui px-5" onClick={() => { setError(''); setRetry(v => v+1); if (cancelled) window.location.replace(`/payments/return?order=${order.id}`); }}>Check payment status</button>}</div>
    <p className="mt-8 break-all text-xs text-muted">Order reference: {order.id}</p>
  </main>;
}
