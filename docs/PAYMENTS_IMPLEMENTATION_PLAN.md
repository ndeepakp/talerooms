# Payment implementation plan

Preparation started 2026-10-13. No payment code, provider account or schema changes yet. User confirmed no merchant account exists yet. Merchant country confirmation is pending; this determines checkout and author payout availability. Do not assume that a Stripe account or Connect eligibility exists from the roadmap alone.

## Existing behavior

Story/chapter purchases currently calculate prices on the server and immediately insert access grants without moving money. Author subscriptions similarly create/extend 30-day access and support cancellation/resume as a demo. Story prices have one of eight supported display currencies; account subscriptions still use the INR default. Existing grants/subscriptions must be handled explicitly when real billing is enabled so they are never mistaken for paid processor records.

## Implementation sequence

1. Confirm business country, approved merchant account and author payout eligibility. Select the supported provider/integration. Decide launch author countries, platform commission, subscription currency/term and refund policy before live billing.
2. Add a payment ledger with immutable server-priced order items, currency/minor-unit amounts, provider references and fulfillment state. Store webhook/event identifiers for idempotency. Separate demo/legacy access from verified paid orders.
3. Add hosted author onboarding and payout readiness. Only offer paid checkout for authors whose provider account meets the required capabilities. Avoid handling bank account/card details directly in Talerooms.
4. Add hosted checkout for whole stories and selected chapters. Snapshot prices, duration and discount eligibility server-side; check ownership and active account status. Pending/failed/cancelled checkout grants no paid access. Return/success URLs display server-confirmed state rather than granting access themselves.
5. Handle verified callbacks/webhooks transactionally. Validate provider signature, order/user/author references, amount/currency and successful payment state. Duplicate or reordered events must not duplicate access or payouts. Access duration begins from the verified paid timestamp. Define refund/dispute reversal behavior explicitly.
6. Add recurring author billing and management. Use the provider's paid period as the access source. Cancellation retains already-paid access to the period end; failed/unpaid renewals must not extend access. Align the existing 30-day wording with the chosen provider's actual recurrence.
7. Add authenticated purchase receipts/order status and author earnings/payout views backed by real payment records. Aggregate currency separately; do not label demo access amounts as real earnings.
8. Validate in provider test mode before live release: successful/failed/abandoned payment, wrong amounts/currencies, forged/replayed callbacks, delayed/duplicate/out-of-order events, inactive account bypass, refund/dispute, cancellation/renewal and mobile checkout return paths. Keep live credentials in environment/Fly secrets and require an approved merchant account before live payments.

Provider-neutral preparation is complete. Implementation awaits merchant-country/account details requested in this chat.
