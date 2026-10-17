# Author wallet

Implemented locally before merchant-account creation. No live money movement is enabled. The app shows an honest setup/empty state when configuration is absent.

## What is implemented

- `/wallet`, linked from the hamburger menu: separate balances per currency, pending settlement, masked default bank, amount review, withdrawal status/estimated arrival and recent transactions.
- Accounts v2 hosted author onboarding with a full Stripe dashboard; Stripe collects identity/bank data. Country selection cannot silently change an existing account.
- Authenticated `/api/wallet`, `/api/wallet/onboarding`, `/api/wallet/withdrawals`.
- Fresh database email verification (legacy activation grace is insufficient for financial mutations), sign-in within 30 minutes, same-origin JSON requests, bounded request bodies and durable per-user throttling.
- Additive migration `db/0050_author_wallet.sql`: account references, withdrawal reservations, observed provider balance transactions, processed event IDs and request limits. Financial records survive profile deletion through a nullable user reference.
- Server-confirmed balances and capabilities; cross-process PostgreSQL advisory locks and persisted reservations. Client-provided bank/account IDs or balances are ignored.
- Stable Stripe payout idempotency keys scoped to account/request; retrying with changed amount/currency/source is rejected. Ambiguous responses hold their reservation. After 23 hours the original payout must be located, otherwise support reconciliation is required.
- Signed connected-account payout events at `/api/wallet/webhook`, with mode matching, current provider retrieval and durable duplicate tracking. Paid → failed is allowed for a subsequent bank failure; stale pending updates cannot regress terminal payouts.

## Configure after creating the merchant account

Start in Stripe test/sandbox mode. Secrets belong in `.env.local` locally and Fly secrets for deployment, never in Git or chat.

```dotenv
STRIPE_MODE=test
STRIPE_SECRET_KEY=sk_test_your_actual_key
STRIPE_WEBHOOK_SECRET=whsec_your_actual_wallet_endpoint_secret
STRIPE_WALLET_ENABLED=false
STRIPE_CONNECT_COUNTRIES=
STRIPE_PAYOUT_CONTROLS_ENABLED=false
```

1. Enable Connect for the Singapore business and confirm the intended author countries/direct-charge arrangement with Stripe. Populate `STRIPE_CONNECT_COUNTRIES` with only approved two-letter country codes, comma separated. There is no implicit worldwide approval.
2. Apply migration `0050` with the repository's SQL migration workflow before enabling the wallet. Check that no existing username equals the newly reserved `wallet` or `payments` routes.
3. Set `STRIPE_WALLET_ENABLED=true` for test mode once credentials/countries are ready. Complete hosted onboarding for a test author. The return/refresh URLs open `/wallet`; returning alone never marks onboarding complete. An expired link is renewed through the authenticated setup button.
4. Configure **connected-account** webhook delivery to `/api/wallet/webhook` for `payout.created`, `payout.updated`, `payout.paid`, `payout.failed`, `payout.canceled`, `account.updated`, `balance.available`. Configure the actual endpoint secret. This endpoint does not fulfill reader purchases or subscriptions. Accounts v2 configuration updates can also be reflected by refreshing the wallet; native v2 thin-event handling is not yet implemented.
5. Verify full-Dashboard platform payout controls and earlier standard payouts while automatic payouts remain enabled. Keep a provider-managed **daily or weekly** schedule; manual/monthly/unknown schedules block app withdrawal. Set `STRIPE_PAYOUT_CONTROLS_ENABLED=true` only after the real test succeeds for the enabled account configuration/countries. If Stripe does not permit this combination, leave app withdrawals disabled and revise the design before live release.
6. Validate provider failures, unknown response/retries, delayed/duplicated webhook events, payout cancellation/bank failures, refunds/disputes, settlement currencies and fallback payouts with actual Stripe test accounts. Confirm settlement/delivery rules for each launch country.
7. Connect paid order fulfillment and subscriptions, resolve fee/refund/tax policies, and complete live release checks before offering paid sales. Explicitly switch mode/key together for any live release.

## Initial limits

- Withdrawal currencies: INR, USD, EUR, GBP, SGD, AUD, CAD, JPY. Presentment currency and bank settlement currency can differ. Other balances remain with Stripe and cannot be withdrawn through Talerooms yet.
- Standard bank withdrawals only; no guaranteed instant delivery. Stripe enforces account-specific minimums/limits. The server selects the default bank for the currency; authors manage destinations with Stripe.
- Automatic payouts stay active and may race a user request; Stripe is authoritative and can reject a request whose funds already left.
- Wallet reads persist/display the latest 100 provider balance transactions, not a lifetime earnings total. The local observed ledger is not yet a complete historical import/accounting export. Pending author withdrawals outside that window are individually reconciled; signed late payout events locate historical requests by reference.
- No wallet top-ups, peer transfers, fake earnings or credits from existing demo grants. The checkout/subscription order ledger and access fulfillment remain separate pending work.
- No Stripe credentials currently configured; hosted account creation, full-Dashboard controls, webhook delivery and real payout requests are not validated with the provider yet.

## Validation

Unit tests cover money parsing, authorization/CSRF/recent sign-in, account readiness, concurrent/duplicate withdrawal requests, unknown provider results, retries, failures and expired idempotency keys. The explicit local PostgreSQL integration test checks real advisory locking, durable replay, payout status transitions and transaction uniqueness:

```sh
WALLET_DB_TESTS=true node --env-file=.env.local node_modules/vitest/vitest.mjs run src/lib/wallet/store.integration.test.ts
```

Run only against the local development database after migration. Isolated synthetic financial fixtures are retained; no production data is used or erased. The normal suite skips this database test unless explicitly enabled.

Mobile QA covers empty/populated fixture views and amount review at 320/390/430 pixels, plus tablet/desktop. A temporary development-only fixture page is removed before the final build. Local API checks cover anonymous/unverified access, cross-origin requests, unconfigured provider behavior and forged webhooks.

References: [Connected-account payouts](https://docs.stripe.com/connect/payouts-connected-accounts), [payout schedules](https://docs.stripe.com/connect/manage-payout-schedule), [full-Dashboard platform controls](https://docs.stripe.com/connect/platform-controls-for-stripe-dashboard-accounts), [currency rules](https://docs.stripe.com/currencies).

Final local result (2026-10-14): 127 unit tests passed, the separately enabled PostgreSQL integration test passed, eight local HTTP checks passed, lint/TypeScript/production build passed. Empty/populated/review mobile views had no horizontal overflow at 320/390/430 pixels; tablet/desktop checked at 768/1280 pixels and the dark mobile view visually checked. This is synthetic/local validation, not Stripe provider certification.


## Local sandbox connection — 2026-10-17

The saved test key successfully authenticated against the Singapore platform. Local `.env.local` enables `STRIPE_MODE=test`, `STRIPE_WALLET_ENABLED=true`, and `STRIPE_CONNECT_COUNTRIES=SG`. `STRIPE_PAYOUT_CONTROLS_ENABLED=false` deliberately keeps app withdrawals disabled. Singapore is the initial **sandbox** test country; this does not approve live author countries or international payouts.

Run `npm run stripe:listen` alongside `npm run dev` for local Connect snapshot webhook forwarding. The pinned official Stripe CLI receives the test key through its environment rather than command arguments. The helper saves the CLI signing secret privately to the ignored `.env.local` file and suppresses it from output. The helper rejects live mode and live keys. Keep the listener running while testing; restart it after restarting the development environment. This is not a production webhook deployment.

Validated with an isolated local QA author and an actual Stripe sandbox connected account:

- Wallet and onboarding endpoints returned 200; hosted onboarding opened at `connect.stripe.com`, with Stripe's explicit test-data banner.
- Reopening onboarding reused the same connected account. No sample-dashboard login or manually linked account ID was needed.
- The real account snapshot reported charges/payouts disabled; the wallet displayed “Finish your payout setup”, and withdrawals remained unavailable.
- A sandbox-only metadata update generated a real signed `account.updated` event. Stripe CLI forwarded it to `/api/wallet/webhook`, which returned 200 and persisted one event record.
- Unauthenticated wallet access returned 401; foreign-origin onboarding 403; unsupported sandbox country 400; incomplete-account withdrawal 409; unsigned webhook 400.
- Desktop and 390px mobile wallet/hosted-onboarding views checked; mobile wallet had no horizontal overflow.
- 145 standard tests passed, plus TypeScript, helper lint/syntax checks and live-mode refusal. The five opt-in DB tests were not rerun for this tooling/configuration change.

Still pending: author-controlled completion of Stripe onboarding, provider-observed pending/ready states, bank verification and payout-control testing, and real sandbox checkout/fulfillment. Opening or returning from onboarding does not establish readiness. No real funds, charges or withdrawals were used. Production settings were not changed.

Expanded validation: [Stripe Connect sandbox stress report](STRIPE_CONNECT_QA_2026-10-17.md) — 155 standard tests, 10 local DB tests, 22 HTTP stress scenarios, 15 route smoke checks and four viewport widths. Provider completion and payouts remain pending.
