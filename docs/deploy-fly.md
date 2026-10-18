# Talerooms beta deployment on Fly.io

Updated: 18 October 2026 (Singapore).

## Environment policy

Use the **existing** `talerooms` app at https://talerooms.fly.dev and its private database `talerooms-pg`. `talerooms.com` will point to this same application; it does not need another Fly app or database.

The user requested removal of the separately provisioned dev environment. Do not recreate `talerooms-dev` or `talerooms-dev-pg` without an explicit request. Test locally before releasing to the existing app. Domain launch is pending DNS/TLS and authentication setup; removal of dev is not a production deployment.

| Resource | Existing configuration |
| --- | --- |
| Web app | `talerooms`, region `sin`, root `fly.toml` |
| Public hostname | `talerooms.fly.dev` |
| Database | `talerooms-pg`, self-managed Postgres + pgvector; private-only |
| Web capacity | One always-on shared CPU, 1 GB RAM |
| Upload storage | Existing `talerooms_uploads` volume at `/app/public/uploads` |
| Proposed canonical domain | `https://talerooms.com`; `www` redirects to the apex |
| Payments | Stripe test mode; live payments are a separate release |

## 1. Prepare and verify the candidate

From the repository root:

```bash
npm ci
npm test
npm run lint
npx tsc --noEmit
npm run build
git diff --check
```

Run opt-in database integration tests only against an isolated local test database, never the hosted application's database. Inspect the target privately before `npm run test:payments:local`.

Review the diff and staged files before committing/pushing. Exclude environment files, credentials, private screenshots, uploads and unrelated `artifacts/`. A GitHub push is not evidence of a Fly deployment; confirm any workflow before relying on automation.

The UI batch has no SQL migration. Do not replay all historical `db/*.sql` files against an existing database: migrations are not all repeatable and there is no automatic migration ledger. Future schema upgrades need a reviewed pending-migration list, backup, error-stop execution and backward compatibility. Historical SQL alone is not a complete fresh-install baseline for Better Auth/extensions.

Local UI evidence is recorded in [the QA report](UI_QA_2026-10-18.md). The latest candidate pass had 201 passing tests, 14 opt-in database tests skipped, and passing lint, TypeScript and build. Re-run checks after relevant code changes.

## 2. Finish beta readiness before cutover

- Restrict deployed authentication origins to exact intended hosts. The current non-dev allowlist still unconditionally includes localhost and a tunnel wildcard; this needs hardening.
- Use consistent canonical metadata, sitemap and Open Graph URLs. Most metadata uses `BETTER_AUTH_URL`; the story Open Graph image still names the Fly hostname.
- Implement and test `www` → apex redirects preserving path/query. DNS aliases do not create HTTP redirects. Preserve direct old-host auth callbacks and Stripe webhook routes during transition.
- Sanitize `/api/health`: keep a meaningful database readiness probe, return 200/503, and avoid public database versions/raw errors.
- Review container permissions. Runtime currently starts as root to fix mounted upload permissions; do not assume the created `nextjs` user is already used.
- Review dependency findings, operator access and logging. Do not log credentials, OTPs, payment details or private content.
- Clearly disclose sandbox payments; no real earnings/charges or withdrawals should be promised. Never expose legacy mock purchases as a fallback.
- Verify user-facing support, privacy/terms and enabled-feature descriptions.

Read the applicable guide in `node_modules/next/dist/docs/` before framework changes, per `AGENTS.md`.

## 3. Backups and recovery

Before changing the existing app:

1. Capture current release/image, config, secret names/versions and feature flags in protected records.
2. Take an encrypted logical database backup and an upload backup outside the app/database machines. Define retention and access controls.
3. Rehearse restoration in an isolated recovery environment and verify schema, accounts, content references and uploads. Record recovery-time/data-loss expectations.
4. Check actual Fly snapshot schedules, backup age, database/upload disk space and memory. Snapshots supplement a tested recovery procedure; they are not a substitute.

The database is self-managed, not Fly Managed Postgres. Web and database each remain single-machine failure points. Uploads must move to shared object storage before scaling web instances with independent disks. Current deployments may require a maintenance window.

See [Fly volume snapshots](https://fly.io/docs/volumes/snapshots/).

## 4. Configure talerooms.com on the existing app

The domain is purchased but currently resolves to parking addresses. Authoritative nameservers observed: `ns47.domaincontrol.com` and `ns48.domaincontrol.com`. Confirm access to its DNS management dashboard. Preserve existing email MX/TXT/DKIM/SPF records.

Certificates for both hostnames are already attached to `talerooms`, but were not verified at the latest check. Re-read current requirements before changes:

```bash
fly ips list -a talerooms
fly certs setup talerooms.com -a talerooms
fly certs setup www.talerooms.com -a talerooms
```

Observed Fly values on 18 October 2026:

| Type | DNS name | Value |
| --- | --- | --- |
| A | `@` | `66.241.125.152` |
| AAAA | `@` | `2a09:8280:1::12b:dae9:0` |
| CNAME | `www` | `8xgl6pe.talerooms.fly.dev` |
| CNAME | `_acme-challenge` | `talerooms.com.8xgl6pe.flydns.net` |
| CNAME | `_acme-challenge.www` | `www.talerooms.com.8xgl6pe.flydns.net` |
| TXT | `_fly-ownership` | `app-8xgl6pe` |
| TXT | `_fly-ownership.www` | `app-8xgl6pe` |

Use the current per-host Fly instructions. ACME challenge records allow certificates to be issued before routing traffic; ownership records may be required depending on routing/CDN configuration. Do not blindly add duplicate certificates or replace unrelated DNS records. Save the zone before changes; lower TTL in advance where practical.

```bash
fly certs check talerooms.com -a talerooms
fly certs check www.talerooms.com -a talerooms
fly certs show talerooms.com -a talerooms
fly certs show www.talerooms.com -a talerooms
dig +short talerooms.com A
dig +short talerooms.com AAAA
dig +short www.talerooms.com CNAME
```

Require correct public resolution, valid HTTPS for both names and tested redirects. Elapsed time alone does not prove propagation. See [Fly custom domain setup](https://fly.io/docs/networking/custom-domain/).

## 5. Authentication, email and runtime settings

- Google Web client: add `https://talerooms.com` as an authorized JavaScript origin and `https://talerooms.com/api/auth/callback/google` as an authorized redirect URI. Keep the existing Fly callback during transition. Review authorized domain, audience, branding and support/privacy/terms settings as applicable.
- Set `BETTER_AUTH_URL=https://talerooms.com` only with verified DNS/TLS and provider callbacks ready. Preserve `BETTER_AUTH_SECRET`, `DATABASE_URL` and the existing VAPID keypair. Do not regenerate keys on redeploy.
- Existing email sender is `Talerooms <verify@auth.talerooms.com>`. Preserve its authentication records; verify Resend sending readiness, delivery and resend/verification behavior. A new Gmail account is not necessary.
- Keep `STRIPE_MODE=test`, `STRIPE_CHECKOUT_ENABLED=true`, `STRIPE_WALLET_ENABLED=true`, approved countries `SG`, and app payout controls disabled until their separate validation. Preserve the existing endpoint signing secret.
- Retain the working `https://talerooms.fly.dev/api/wallet/webhook` endpoint initially. The verifier accepts one signing secret, so a later webhook hostname migration needs planned overlap/draining or dual-secret support.
- Runtime secrets belong in Fly protected settings/stdin. Never copy `.env.local` wholesale. `NEXT_PUBLIC_*` values are public build inputs, not secret storage; the public VAPID key is compiled into the bundle.

Sessions and push subscriptions on the old origin do not automatically transfer to the custom domain; users may need to sign in and enable notifications again. See [Fly secrets](https://fly.io/docs/apps/secrets/).

## 6. Deploy, verify and monitor

After readiness checks and backup verification, deploy the reviewed revision to the existing app:

```bash
fly releases -a talerooms --image
fly status -a talerooms
fly deploy --config fly.toml --app talerooms --ha=false
fly checks list -a talerooms
curl --fail --silent --show-error https://talerooms.com/api/health
```

Record Git SHA, image digest, release number, migrations/flag changes and checks. Use explicit app/config arguments; do not create new apps, volumes or databases for a redeploy. See [Fly deployment behavior](https://fly.io/docs/launch/deploy/).

Verify signup, OTP, Google login, existing-account login, logout, private/public access, publishing, search, uploads, profile Thoughts, Feed, Library, navigation and Wallet on desktop and mobile. Check long names/content, dropdowns, keyboard focus, empty/error states and missing-page recovery. Verify upload persistence after restart and test publishing/embeddings within memory limits.

For payment acceptance, complete an actual Stripe sandbox author onboarding → paid chapter publication → separate reader Checkout → signed webhook → persisted entitlement flow. Verify failure/cancellation, replay/idempotency and balance reconciliation. Redirect success or locally signed test events do not prove a paid purchase. Do not run automated test suites against production data.

Monitor uptime, app/database errors, memory/disk, backup freshness, email failures, webhook retries and payment reconciliation; configure alerts and billing thresholds. No hosted alerting/restore drill should be claimed complete without evidence.

## 7. Rollback

Re-capture the last-good production image before each release. Latest verified baseline: v45, `registry.fly.io/talerooms:deployment-01M54R7XFW3GR2QSTCWXQQDAD8`.

```bash
fly deploy --config fly.toml --app talerooms --ha=false \
  --image registry.fly.io/talerooms:deployment-01M54R7XFW3GR2QSTCWXQQDAD8
```

Image rollback does not revert secrets, database changes, uploads, DNS or provider configuration. Restore matching base URL/config and keep a working hostname during DNS propagation; reverting to parked DNS is not service recovery. Reconcile/replay failed webhook events safely. Never drop user data to match an older image.

## 8. Live payments are a separate release

Checkout explicitly enforces test keys/orders/events. Changing `STRIPE_MODE=live` alone does not implement live checkout. Before real money, implement/review live handling, platform and author activation, fees, supported countries/currencies, refunds/disputes, settlement/withdrawal policy, reconciliation and a controlled authorized live purchase/refund. Recurring Stripe subscriptions are not implemented.

## Deployment history and cleanup

- The UI/infrastructure candidate was pushed as `34019b4`, followed by config correction `fadfbf5`; deployment notes were pushed as `7eb1fb5`.
- A separate dev environment briefly ran that candidate as v1. Its checks passed 40 HTTPS assertions (including real password login, scoped data writes and signature boundaries) and login layout checks at 1280/390/320px. No completed Stripe purchase/settlement or fresh email delivery was certified by those checks.
- On 18 October 2026, the user requested destroying the duplicate environment and using the existing app. Cleanup targets only `talerooms-dev`, its dedicated `talerooms-dev-pg`, associated volumes and its sandbox webhook. Its provisioning files/bootstrap script have been removed to avoid accidental recreation.
- The original `talerooms` app/database and domain DNS are not changed by this cleanup. The UI candidate has not yet been deployed to the original app. The domain launch remains pending readiness work and DNS/provider access.
