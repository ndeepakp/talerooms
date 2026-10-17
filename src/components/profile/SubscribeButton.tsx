"use client";

import { completeMockRequest } from "@/lib/mock-checkout";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CURRENCY, formatPrice } from "@/lib/pricing";

// Subscribe / unsubscribe to an author (mock checkout, 30-day term).
//   - Not subscribed → a Subscribe button that runs the mock payment.
//   - Subscribed     → a status pill + Unsubscribe. No payment is triggered
//     while a subscription is active.
//   - Cancelled but still in the paid period → keeps access until it lapses,
//     with a Resume option (no new charge).
export function SubscribeButton({
  authorId,
  price,
  initialDaysLeft,
  initialCancelled,
  stripeCheckout = false,
}: {
  authorId: string;
  price: number;
  initialDaysLeft: number | null;
  initialCancelled: boolean;
  stripeCheckout?: boolean;
}) {
  const router = useRouter();
  const [daysLeft, setDaysLeft] = useState(initialDaysLeft);
  const [cancelled, setCancelled] = useState(initialCancelled);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const active = daysLeft !== null && daysLeft > 0;

  async function subscribe() {
    if (stripeCheckout) return;
    // No payment prompt while access is still active (e.g. resuming a cancel).
    if (!active) {
      if (!window.confirm(`Mock payment: subscribe for ${formatPrice(price)} / 30 days?`)) {
        return;
      }
    }
    setLoading(true);
    setError(null);
    const res = await completeMockRequest(`/api/users/${authorId}/subscribe`, { method: "POST" });
    setLoading(false);
    if (res.ok) {
      if (!active) setDaysLeft(30);
      setCancelled(false);
      router.refresh();
    } else { setError(res.error); }
  }

  async function unsubscribe() {
    if (
      !window.confirm(
        "Unsubscribe? You'll keep access until your current period ends, but it won't renew.",
      )
    ) {
      return;
    }
    setLoading(true);
    setError(null);
    const res = await completeMockRequest(`/api/users/${authorId}/subscribe`, { method: "DELETE" });
    setLoading(false);
    if (res.ok) {
      setCancelled(true);
      router.refresh();
    } else { setError(res.error); }
  }

  if (stripeCheckout && !active) {
    return <div className="flex w-full flex-col gap-3">
      <a href="#works" className="btn-primary">Explore stories</a>
      <p className="text-xs text-muted">Subscriptions coming soon</p>
    </div>;
  }

  if (active) {
    return (
      <div className="flex max-w-full flex-col items-start gap-1 sm:items-end">
        {error && <p role="alert" className="max-w-xs text-sm text-danger">{error}</p>}
        {cancelled ? (
          <>
            <span className="rounded-full bg-warning-soft px-3 py-1 text-xs font-medium text-warning">
              Access for {daysLeft}d · won&apos;t renew
            </span>
            {!stripeCheckout && <button
              type="button"
              onClick={subscribe}
              disabled={loading}
              className="min-h-11 px-1 text-xs text-muted underline hover:text-ink-soft disabled:opacity-50"
            >
              Resume subscription
            </button>}
            {stripeCheckout && <span className="text-xs leading-relaxed text-muted">Existing demo access remains until it expires. Renewal is unavailable.</span>}
          </>
        ) : (
          <>
            <span className="rounded-full bg-success-soft px-3 py-1 text-xs font-medium text-success">
              {stripeCheckout ? "Demo access" : "Subscribed"} · {daysLeft}d left
            </span>
            <button
              type="button"
              onClick={unsubscribe}
              disabled={loading}
              className="min-h-11 px-1 text-xs text-muted underline hover:text-danger disabled:opacity-50"
            >
              Unsubscribe
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex max-w-full flex-col items-start gap-2">
    <button
      type="button"
      onClick={subscribe}
      disabled={loading}
      className="min-h-11 max-w-full rounded-full btn-primary px-5 text-sm font-medium transition-colors disabled:opacity-50"
    >
      Subscribe · {CURRENCY}
      {price}/30d
    </button>
    {error && <p role="alert" className="max-w-xs text-sm text-danger">{error}</p>}
    </div>
  );
}
