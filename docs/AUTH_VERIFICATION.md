# Signup and account verification

Google and Resend credentials are configured. Real local Resend delivery and user-completed OTP verification reached onboarding on 2026-10-12. Production rollout was requested by the user; completed Google OAuth success/cancellation remains a manual follow-up check.

## Account lifecycle

Email/password signup creates an authenticated **pending** account. It may browse public content, verify its own email, correct an unverified email using a code sent to the new address, or sign out. Normal pages and API mutations require an active account. Email verification sets Better Auth's existing `emailVerified` flag; profile/genre setup follows verification.

Google uses Better Auth's provider flow, including server token validation and the provider's email verification claim. Verified provider accounts are active; a provider account without verified email must complete the same OTP flow. Callback destination `/auth/complete` chooses verification, profile setup or the feed. Implicit linking by matching email is disabled; signing in with Google cannot silently merge a pre-existing password account. Use that account's original login method. Explicit account linking is not exposed in this batch.

The user requested a temporary transition for existing accounts. Migration `0049_account_verification.sql` grants currently unverified accounts **30 days from migration time** using `verificationGraceUntil`, without changing `emailVerified`. New accounts receive no grace. Re-running the migration does not renew grace. A server-rendered reminder displays the deadline; after it expires, existing sessions lose protected access until verification. Account data remains intact. Configure delivery before applying the production migration so users can actually verify during the window.

Verification checks read the current account row, including for stale client sessions. Public story/profile views treat pending users as anonymous. All app API session gates and the previously separate follow/reaction/genre handlers enforce activation. Auth mutations are also restricted for pending sessions.

## Environment setup

Keep secrets in `.env.local` and Fly secrets; never commit them or paste them into chat.

```
GOOGLE_CLIENT_ID=your-google-web-client-id
GOOGLE_CLIENT_SECRET=your-google-web-client-secret
RESEND_API_KEY=your-resend-key
AUTH_EMAIL_FROM=Talerooms <verify@your-verified-sending-domain>
BETTER_AUTH_URL=http://localhost:3000
```

Create a Google OAuth Web application with the consent screen configured for the intended audience. Register exact callback URLs:

- Local: `http://localhost:3000/api/auth/callback/google`
- Fly: `https://talerooms.fly.dev/api/auth/callback/google`
- Custom-domain callbacks only when that domain serves this app and its `BETTER_AUTH_URL` is configured accordingly.

For production set `BETTER_AUTH_URL=https://talerooms.fly.dev` (or the actual canonical domain) and keep trusted origins aligned. No wildcard Google callback URLs. Verify the Resend sending domain and send an actual delivery test before rollout. The server uses Resend's HTTPS send-email API: https://resend.com/docs/api-reference/emails/send-email. Google controls remain disabled when credentials are absent; signup fails closed when transactional email delivery is absent.

## OTP handling

- Six digits, 5-minute lifetime, hashed in Better Auth's verification table.
- Five incorrect attempts per code; consumed/superseded/expired codes are rejected.
- Authenticated, account-bound verification requests; no arbitrary recipient code oracle or OTP passwordless-signin endpoint.
- PostgreSQL advisory locks serialize code operations per account across app instances, closing concurrent consume/attempt races in the installed plugin.
- Durable per-account limits: 60-second resend cooldown, at most 10 send requests and 30 verification requests per hour. Rejected quota/cooldown requests count towards the quota. Better Auth also applies per-IP endpoint limits. Deployment proxies must provide trustworthy client-IP headers.
- Changing an unverified email requires a fresh authenticated session and a code for the new email. The email is unchanged until verification succeeds. Correction for already-verified accounts is outside this batch.
- Codes and provider responses are never logged or returned to the browser outside the normal submitted form.

## Local test delivery

Only for synthetic addresses ending in `@example.test`, set `AUTH_EMAIL_MODE=local-test` and optionally `AUTH_EMAIL_TEST_DIR=/private/tmp/talerooms-auth-mail`. The server writes owner-only files to that local directory instead of sending email. The sink is disabled in production and rejects real recipients. Remove these variables after local QA. Never use it as a fallback production mail service.

## Validation and remaining release gates

81 local API/security/reader-flow checks and 72 unit tests passed, along with ESLint, TypeScript and production build. Signup and verification fit 320/390/768/1280px; keyboard verification and genre/profile onboarding reached the feed without browser console errors. Temporary mail-sink configuration was restored after QA.

Local checks cover activation injection, protected page/API bypass attempts, wrong/expired/consumed/superseded codes, resend limits, concurrent consumption, correction, duplicate signup, migration grace and stale-session expiry. Verified-account checks cover bookmarks, reviews, community submissions, reading resume, reactions, follow and existing mock access/subscription flows. Real Stripe processing remains a separate task.

Actual Google success/cancellation and actual Resend inbox delivery require configured credentials and remain release gates. The login cancellation/error view and disabled-provider behavior can be checked without credentials; neither substitutes for a real provider callback test.

QA evidence: `/private/tmp/talerooms-auth-qa/`. Synthetic local fixtures are retained pending cleanup approval; no production accounts or records were changed.

## Release validation (2026-10-12)

72 tests, ESLint, TypeScript, production build and diff checks passed again. Real Resend delivery and user-completed verification reached onboarding; the account database confirms `emailVerified=true`. Google authorization reached the official Google login screen, but a completed provider callback and real cancellation have not been observed. Credentials were staged securely as Fly secrets. Production migration `0049` applied successfully, granting eight existing unverified accounts one 30-day transition window. This migration preserves existing accounts and does not renew grace on rerun. No actual payment processing was introduced. Deployment and public health checks are recorded in the improvement task ledger.
