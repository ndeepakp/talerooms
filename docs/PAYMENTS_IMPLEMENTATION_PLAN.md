# Payment implementation plan

Preparation started 2026-10-13. No payment code, provider account or schema changes yet. User confirmed a Singapore merchant account is planned and authors will be in multiple countries. No merchant account exists yet. Provider approval/author-country eligibility must be confirmed before live payouts. Do not assume that a Stripe account or Connect eligibility exists from the roadmap alone.

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

## Validated foundation — 2026-10-13

Local foundation only; payment endpoints and existing demo access behavior have not been changed.

- Installed official Stripe SDK 23.0.0.
- Added server-priced whole-story/chapter quotes, safe integer/minor-unit conversion (JPY zero-decimal), duplicate chapter handling, currency/duration/ownership validation, and the existing server-established renewal discount.
- Added an offline direct-charge Checkout parameter builder: author-account binding, provider/operator-approved country check, charges/payouts readiness, immutable order reference, retry idempotency key and a server-controlled return origin. It does not create a Session or grant access. The installed SDK uses `allowed_payment_method_types` for card selection.
- Added raw signed-event verification using the SDK, with event-mode matching and signature-expiry/tampering tests. At that foundation stage there was no public webhook route or fulfillment handler; the later wallet step adds a payout-only webhook, not paid-access fulfillment.
- Test/live keys must match an explicit mode (default test); credentials fail closed when absent. No real provider calls, charges, bank onboarding, payouts or database migration were performed.
- 88 tests, lint, TypeScript and production build passed. Production-only dependency audit remains zero findings. This foundation is local and not pushed/deployed.

### Selected direction and remaining decisions

Use Stripe-hosted Checkout with author connected accounts, evaluating **direct charges** rather than assuming a Singapore platform can transfer funds to all foreign authors. Each author must be eligible in their own country, complete onboarding and have enabled payment/payout capabilities. New account onboarding should use the current Accounts v2 API, not legacy Express/Custom types without reviewing current documentation. Country availability, merchant-of-record responsibilities, fee policy, taxes, refunds/disputes and subscription terms still need confirmation before live release.

Sources: [Direct charges](https://docs.stripe.com/connect/direct-charges.md?platform=web&ui=stripe-hosted), [Accounts v2](https://docs.stripe.com/connect/accounts-v2), [cross-border payout restrictions](https://docs.stripe.com/connect/cross-border-payouts). Global reader access does not imply universal author payout eligibility.

### Merchant setup required for end-to-end testing

Create the Singapore Stripe account and configure Connect. Start in test/sandbox mode. Store only the server test key locally (never in chat/GitHub):

```dotenv
STRIPE_MODE=test
STRIPE_SECRET_KEY=sk_test_your_actual_key
```

A `STRIPE_WEBHOOK_SECRET` will be needed when the ledger and public webhook endpoint are implemented/configured; do not invent a value now. Author-country approvals and actual test-mode onboarding/Checkout/callback flows remain unvalidated until a merchant test account is available.

Author Accounts v2 onboarding, wallet and payout-event handling are now implemented locally; see [wallet setup](AUTHOR_WALLET.md). Next: persisted order/payment ledger, checkout/fulfillment and recurring subscriptions. The foundation is not a complete payment integration.

## Author wallet — local implementation, 2026-10-14

Authors see separate pending/available balances, masked default bank destinations, withdrawal review/status/history and recent provider transactions including fees, refunds and adjustments. Actual funds remain with Stripe. Existing mock sales/subscriptions never credit these balances.

Accounts v2 hosted onboarding uses a full Stripe Dashboard and Stripe fee/loss responsibilities, subject to actual approval for this Singapore platform and each author country. Withdrawals require active verified email, recent sign-in, ownership, an approved country, enabled charge/payout capabilities, matching default bank currency, confirmed payout controls, and a daily/weekly automatic schedule. Currency support initially matches the eight Talerooms currencies; other balances direct authors to Stripe rather than guessing provider minor-unit rules.

The initial fallback is **Stripe-managed automatic daily/weekly payouts**, with an earlier standard payout request only where permitted. Talerooms never sets a permanent manual schedule, avoiding a custom cron dependency for moving held funds. Confirm this combination in provider test mode before enabling controls. Amounts, fees, delivery and country eligibility are subject to Stripe/bank rules.

Requests are persisted before provider calls. Account locks serialize reservations, unresolved network results remain reserved, and client/request-specific Stripe keys prevent duplicate payouts. Unknown requests older than 23 hours must find their original provider payout or remain held for review; they are never blindly re-created after key expiry. A verified webhook fetches current provider state and records processed IDs; stale payloads never add spendable money. A provider failure does not create a second local balance credit.

Local validation does not replace provider end-to-end testing. Paid checkout/order fulfillment and recurring billing remain pending. See [configuration, rollout gates and validation](AUTHOR_WALLET.md).
