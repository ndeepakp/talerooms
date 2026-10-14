# Payment and layout regression check — 2026-10-14

Local testing only. No real charges, bank payouts, push or deployment were performed.

## Fixes found during validation

- Purchase JSON `null` previously reached a property access and returned 500. Purchase quotes now validate the full request, every selected chapter and stored prices before any grant is inserted. Invalid/free/unpublished/self purchases fail cleanly. Amounts exceeding the mock grant's PostgreSQL integer limit are rejected.
- Simultaneous subscription POSTs could both observe an expired period and extend it twice. A reader/author advisory lock now serializes the active-period check and write, preserving a single 30-day term. Active retries/resume remain uncharged and retain expiry.
- A lost purchase/subscription response could leave controls busy or show no error. Both components now surface server/network errors and release their controls. Ambiguous network failures advise refreshing access and never retry automatically.
- Changing access duration now clears stale chapter selections. Chapter checkbox accessible labels identify their title and current price.

## Automated coverage

`npm test`: 138 passing tests, including seven new React DOM checkout/membership tests and four request-result tests. Tests cover canceled confirmation (no request), accepted confirmation/payload/refresh, chapter totals, changing duration, in-flight double clicks, network failure, server errors and subscription cancel/resume without another payment prompt.

`npm run test:payments:local`: five passing database tests (four mock payment flows plus the wallet concurrency test). Run against the local database after migration `0050`; the command loads `.env.local`. Payment fixtures are inserted in a transaction and rolled back. It exercises actual purchase/subscription handlers, server-owned pricing despite client tampering, chapter deduplication/access, expiry, whole-story renewal discount, permanent access, unavailable/invalid/self purchases, author-only revocation, subscription term/cancel/resume/expired renewal, and no wallet credit from mock purchases. The wallet test checks cross-transaction reservations and durable reconciliation.

Local HTTP checks separately validated simultaneous subscriptions: exactly one initial checkout and one active replay; expiry stayed at 30 days. Null/mixed-index payloads returned 400, selected chapters and discounted whole access returned 200, and cancellation/resume kept the same period. Wallet authentication/verification/CSRF/forged-webhook checks remain part of the smoke run.

## Desktop/mobile browser checks

Eleven pages checked at 320, 390 and 1280 pixels (33 render checks): feed, wallet, library, collections, settings, drafts, writer editor, notifications, search, author profile and private story. No horizontal document overflow or application-error screens were observed. Representative screenshots inspected visually. Wallet loading was additionally allowed to complete before confirming its honest unconfigured-provider state.

After a mock chapter purchase through HTTP, the mobile reader showed the purchased chapter's text and retained the other chapter's lock. The profile's Resume subscription action was exercised in the browser; it returned to Subscribed with the same 30-day term. Membership then unlocked the second private chapter on a separate story.

The in-app browser automation stalled on the native `window.confirm` dialog for an initial purchase. That OS/browser dialog step was not completed by browser automation. Confirmation/cancellation and the actual client request/refresh behavior are covered by React DOM tests with a controlled confirm result; the backend flows and browser access outcomes were verified separately. This is a tooling limitation, not a successful native-dialog end-to-end claim.

Browser screenshots and detailed HTTP/layout results are retained locally under `/private/tmp/talerooms-payment-flow-qa/`. Synthetic published stories are retired to drafts after the run; the existing synthetic author's profile/subscription settings are restored. No real users or deployed records are changed.

## Remaining release gates

Real Stripe onboarding, author-country eligibility, full-Dashboard payout controls, settlement, real webhook delivery and bank payout testing require the merchant test account. Mock purchases do not fund the wallet or validate those provider capabilities. Real checkout fulfillment and recurring billing remain pending.

Final result: 138 standard tests + five explicitly enabled database tests passed. Lint and production build/TypeScript passed. The final standalone server booted successfully, and both mock payment and wallet HTTP/state smoke runs passed against that production build (17 checks). Production dependency audit: zero findings. Five existing development-only dependency findings remain; no forced dependency upgrades were performed. No regressions were observed in the completed checks; the native confirmation-dialog automation limitation above remains explicit.
