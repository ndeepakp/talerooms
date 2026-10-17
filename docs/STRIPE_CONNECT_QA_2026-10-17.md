# Stripe Connect sandbox stress validation — 2026-10-17

## Full author-to-reader purchase journey: NOT RUN / BLOCKED

The previous checks are not a completed signup → publish a paid story → Stripe checkout → reader access → author earnings test. The initial inspection found:

- `POST /api/stories/[id]/purchase` still inserts demo access grants directly and does not create a Stripe Checkout Session.
- `buildStoryCheckout` builds parameters offline; no application route calls `stripe.checkout.sessions.create`.
- Persisted purchase orders and verified paid-checkout fulfillment are not implemented.
- A read-only query to the actual sandbox author returned `charges_enabled=false`, `payouts_enabled=false`, with 20 currently due requirements.

No mock purchase was performed as a substitute for the requested real-provider end-to-end test. Feature-gated checkout/fulfillment code was subsequently added (see rollout notes below). That test remains blocked on completed author Stripe onboarding and still must run after the author can accept payments. Sandbox transactions must use actual Stripe APIs and hosted checkout; they still use test funds, not live money.

## Result and scope

The local sandbox connection passed the checks below. Real billing and app withdrawals remain disabled. This does not certify completed author verification, real bank settlement, international author eligibility or live payouts. No production secrets, settings, schema or data were changed in this test pass.

## Automated regression coverage

- `npm test`: **155 passed**, with the ten opt-in database tests skipped in this command.
- `npm run test:payments:local`: **10 passed** against the local PostgreSQL database. Five exercise the actual webhook handler with real Stripe signature verification and transactional SQL fixtures; five cover existing mock payments and wallet concurrency/reconciliation.
- Full lint, TypeScript and production build passed. The final additional test changes were checked with targeted lint, TypeScript and the standard suite.
- Added a local-host guard to the wallet store integration suite, matching the guard on the payment and webhook integration suites. It now refuses a remote database when opted in.

New tests cover lost initial loads and retry, disabled controls during requests, onboarding rejection recovery, readiness without withdrawal approval, review/cancel without payment requests, and immutable request reuse after a lost withdrawal response. Service tests cover reopening onboarding, incomplete/ready/revoked provider snapshots, retry after failed account creation using the same stored reference, and refusing blind recreation after the idempotency window.

The actual webhook-handler tests verify signature tampering/expiry/mode rejection, account ownership from storage rather than event bodies, replay deduplication, provider-failure retry without prematurely recording completion, ignored unrelated events, unknown account isolation and payout-reference validation. Provider snapshots in these tests are simulated: they do not establish real author verification or payout readiness. Webhook transaction fixtures roll back.

## Actual local HTTP and Stripe sandbox checks

**22 stress scenarios passed**, using only the isolated QA author:

- Unauthenticated requests: 401; missing/foreign origins: 403.
- Null/array/malformed JSON: 400; oversized request: 413.
- Revoked email verification is rejected even with an existing session: 403.
- Sign-in older than 30 minutes: 403.
- Unsupported, lowercase, null and object-valued country: 400.
- Six concurrent onboarding requests: five 200 responses and one 429; exactly one owned Stripe account retained. A further request remained throttled. Injected user/account references did not select another account.
- Invalid withdrawal request key/amount/currency: 400; incomplete-account withdrawal: 409.
- Oversized webhook: 413; expired signed payloads: 400.

Temporary QA verification/session timestamps were restored and its test rate-limit counters reset afterward. Earlier connection validation also received a real Stripe `account.updated` event through the CLI, returned 200 and persisted one event record. No Stripe payout or charge was created.

## Application and layout checks

Fifteen authenticated local routes returned their expected page or redirect responses: home, about, login, signup, feed, library, write, drafts, settings, search, notifications, wallet, wallet onboarding return/refresh URLs and health. The database health endpoint returned 200.

Wallet reviewed at **320, 390, 768 and 1280 pixels**. Document width matched the viewport at all sizes. Test mode remained visible; incomplete setup remained clear; no withdrawal-submit control appeared. Desktop/mobile navigation from the wallet to the Stripe-hosted onboarding form was validated in the preceding connection check.

Screenshots and raw local HTTP results are retained under `/private/tmp/talerooms-stripe-connect-qa/`. That directory also contains private synthetic QA credentials; it is not a publishable artifact and must not be committed.

## Remaining gates

- The author completes Stripe's hosted onboarding, including any login, verification, banking and terms steps.
- Observe actual pending/ready/restricted provider transitions after that completion.
- Test approved bank destinations, payout controls and real Stripe sandbox payouts before enabling app withdrawals.
- Implement and validate persisted orders, actual sandbox checkout, subscriptions, verified payment fulfillment and refund/dispute handling.
- Validate country eligibility and production configuration independently before live billing.

No claim is made that every failure is impossible. These checks establish the tested boundaries and leave the provider-dependent gates open explicitly.


## Feature-gated checkout rollout

Added additive migration `0051_stripe_checkout_orders.sql`, persisted immutable order quotes, buyer-scoped request references, reuse of open baskets, author-account-scoped Checkout Sessions, a private payment-status page, and transactional access grants linked to the order. The connected-account webhook re-fetches the Checkout Session and PaymentIntent and verifies mode, exact amount/currency, account/session/order binding and successful payment before granting access. Redirects never grant access. Author readiness and current email verification are enforced. Membership/owned access blocks new purchases. Legacy demo purchasing is rejected when Stripe checkout is selected; no provider failure falls back to a demo grant.

`STRIPE_CHECKOUT_ENABLED=true` enables this only in the local sandbox. The backend explicitly rejects live checkout; sandbox application fees default to zero pending a live commission decision. Production stays off. Refund/dispute reconciliation, recurring subscriptions and live billing remain out of scope for this gated rollout and must be completed before live activation.

Validation after implementation: **178 standard tests and 13 local DB integration tests passed**, along with lint, TypeScript and production build. New order/fulfillment DB tests use explicitly simulated provider responses to validate SQL transaction behavior; they are **not provider end-to-end proof**. Actual local HTTP checks confirmed the demo endpoint is disabled, an unready author gets 409, a foreign origin gets 403, private unknown order status gets 404 and anonymous status gets 401.

The full actual-provider journey remains NOT RUN. No checkout was paid, no new paid access was claimed, and author earnings from a real sandbox purchase have not been verified. Await author onboarding, then validate through hosted Stripe checkout and real signed webhook delivery.


## Deployment record

App commit `3887fa5` was pushed and deployed on 2026-10-17 as Fly v42 in Singapore. Additive migration `0051` was applied transactionally to production; the application database role has read/insert/update permissions on orders and insert permission on processed payment events. Production explicitly sets `STRIPE_CHECKOUT_ENABLED=false`. Local `.env.local` keys and signing secrets were excluded from Git and the image.

Thirteen live checks passed: health, home, about, login, signup, a published story, wallet page/API authentication, private payment-return/status authentication, rejected disabled checkout, anonymous legacy purchase rejection and unsigned webhook rejection. Fly's health check passes. Production dependency audit reported zero known vulnerabilities.

Deployment is complete. Actual-provider purchase validation is not complete; no successful Stripe checkout or author earnings from a purchase are asserted by this release record.

## User-requested deployed sandbox activation

The user will perform manual purchase verification and requested checkout activation on the deployed app. Stage `STRIPE_MODE=test`, test secret and dedicated endpoint signing secret, `STRIPE_WALLET_ENABLED=true`, `STRIPE_CHECKOUT_ENABLED=true`, `STRIPE_CONNECT_COUNTRIES=SG`, and `STRIPE_PAYOUT_CONTROLS_ENABLED=false` in Fly. Secrets are excluded from the repository and logs. A dedicated connected-account endpoint targets `https://talerooms.fly.dev/api/wallet/webhook` for 11 wallet/checkout events; the local CLI secret is not reused.

This supersedes the earlier production-host checkout-off configuration, but does not enable live billing or certify the full purchase journey. Incomplete authors remain blocked by provider readiness checks. Local author/payment records do not transfer to the deployed database; complete onboarding from the deployed wallet for deployed purchases.

Activation completed: app commit `ce34a28`, Fly v43, image `deployment-01M5457KSK19JBSYMV0AVVA511`, Singapore machine healthy. Runtime inspection confirmed test-mode checkout/wallet enabled, SG-only eligibility, test-key and endpoint-secret presence, deployed HTTPS auth origin and withdrawals disabled without exposing secret values. Thirteen deployed HTTP checks passed. The old demo purchase endpoint now correctly returns 409, while anonymous Stripe checkout with the correct origin returns 401. No actual-provider purchase was completed in this activation pass.

UI validation for this release: 181 standard tests passed (13 opt-in DB tests skipped), full lint and TypeScript passed; production Docker build passed. Desktop and 320/390px local UI checks covered onboarding inline validation/focus, toolbar alignment and the collection picker.
