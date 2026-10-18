# Talerooms: dev-first release and production rollout on Fly.io

Last reviewed: 18 October 2026 (Singapore). This is a rollout plan, not a record of completed deployment. The next release goes to an **isolated dev environment first**, followed by testing and a separate production decision. `talerooms.com` has been purchased; buying the domain does not configure DNS, HTTPS, authentication or email.

## 1. Current state and release gates

Read-only Fly/DNS inspection on the review date found:

| Area | Verified state | Next action |
| --- | --- | --- |
| Existing public app | `talerooms`, Singapore (`sin`), `https://talerooms.fly.dev`, release v45 | Preserve while preparing dev |
| Web capacity | One always-on shared CPU machine, 1 GB RAM; health check passing | Keep one machine while uploads use a local volume |
| Database | Separate private app `talerooms-pg`, self-managed Postgres 17 + pgvector | Verify backups and restore procedure; this is not Fly Managed Postgres |
| Uploads | `talerooms_uploads`, 1 GB, mounted at `/app/public/uploads` | Back up separately from the database |
| Dev environment | `talerooms-dev` and `talerooms-dev-pg` provisioned after the initial inspection | See the dev rollout record below |
| Domain DNS | Nameservers `ns47.domaincontrol.com` / `ns48.domaincontrol.com`; apex currently resolves to `13.248.243.5` and `76.223.105.230`; `www` aliases the apex | Confirm access to authoritative DNS; replace parking records only at production cutover |
| Domain certificates | Both `talerooms.com` and `www.talerooms.com` attached to `talerooms`, both not verified | Complete Fly verification before directing users to the domain |
| Payments | Checkout implementation explicitly enforces Stripe test mode | Test the provider integration in dev; live money requires a separate implementation/release |
| Latest UI candidate | Local changes; no SQL migrations added by this UI batch | Review, commit, push candidate and deploy to dev first |

Do not recreate the existing app, database or volumes. The root `fly.toml` targets the existing public app. A plain `fly deploy` from the repository is **not** a dev deployment.

### Release sequence

1. Prepare dev configuration, isolated database/uploads, secrets and provider callbacks.
2. Review and push the candidate to GitHub; deploy that exact commit to dev.
3. Run automated checks and desktop/mobile/provider acceptance tests on dev.
4. Record results, image digest and outstanding issues; decide whether to promote.
5. Apply production-readiness fixes, rehearse rollback and configure the domain.
6. Deploy the approved production candidate and cut over to `https://talerooms.com`.
7. Enable live payments only through a later, separately verified release.

The app can launch on the custom domain as a beta before live payments, provided sandbox purchases are clearly disclosed or checkout is explicitly unavailable. Do not present sandbox balances or purchases as real money.

## 2. Prepare the isolated dev environment

The following names were provisioned for the first dev rollout on 18 October 2026:

| Resource | Proposed dev value | Production value |
| --- | --- | --- |
| Web app | `talerooms-dev` | `talerooms` |
| Database app | `talerooms-dev-pg` | `talerooms-pg` |
| Browser origin | `https://talerooms-dev.fly.dev` initially | `https://talerooms.com` after cutover |
| Upload volume | Separate volume attached only to dev | Existing production upload volume |
| Google OAuth | Separate dev Web client | Production Web client |
| Stripe | Dedicated sandbox and endpoint signing secret | Current public beta sandbox; future live credentials separately |
| Auth/VAPID keys | Unique dev keys | Preserve existing production keys |

Use Fly's default HTTPS hostname initially; `dev.talerooms.com` is optional later and needs its own certificate/DNS/callback configuration. Dev adds billable resources; review current Fly pricing/billing before provisioning.

### Configuration work required before first dev deploy

- Create a dedicated `deploy/dev/fly.toml` from the root configuration, changing the app name and reviewing its upload mount and public VAPID build argument. Keep health checks, Singapore region and sufficient memory for embeddings.
- Create `deploy/dev/db/fly.toml` from `deploy/db/fly.toml`, changing the database app name. Keep Postgres private-only and give it a dedicated volume and password. These files are now checked in under `deploy/dev/`.
- Create the two dev apps, their volumes and database credentials; deploy the dev database first. Allocate web IPs if required. Do not allocate public database IPs or reuse the production database URL.
- Initialize dev from a reviewed, schema-only baseline containing Better Auth tables, the vector extension and all current application tables. The historical SQL directory alone is not a complete fresh-install bootstrap. Add only reference data such as genres and synthetic test accounts/content; do not copy production users, sessions, payment IDs or private stories.
- Verify an empty-database bootstrap and document its exact schema revision. Add migration tracking before relying on automated database provisioning.
- Add the exact dev origin to the environment-specific auth allowlist. Configure dev as non-indexable (`noindex` and a dev robots policy); current robots/sitemap behavior is not environment-aware. If dev must be private, use access control too: robots rules are not an access restriction, and Stripe webhooks must remain reachable.
- Store secrets in Fly using protected local input or the dashboard. Never copy `.env.local` wholesale to either environment.

The explicit deploy commands are:

```bash
# Dev database: initial provisioning or a reviewed database maintenance release only.
fly deploy --config deploy/dev/db/fly.toml --app talerooms-dev-pg --ha=false

# Dev web candidate, from the reviewed commit at repository root.
fly deploy --config deploy/dev/fly.toml --app talerooms-dev --ha=false
fly status --app talerooms-dev
fly checks list --app talerooms-dev
curl --fail --silent --show-error https://talerooms-dev.fly.dev/api/health
```

Do not run these against proposed names until ownership, configuration and volumes have been checked. `--ha=false` avoids automatically creating spare machines; it does not provide high availability.

## 3. Environment and external service configuration

| Setting | Dev | Production/cutover requirement |
| --- | --- | --- |
| `DATABASE_URL` | Isolated dev database, private Fly hostname | Preserve existing production database |
| `BETTER_AUTH_SECRET` | Unique dev secret | Preserve existing secret; do not regenerate on redeploy |
| `BETTER_AUTH_URL` | Exact HTTPS dev origin | `https://talerooms.com` at approved cutover |
| `BETTER_AUTH_TRUSTED_ORIGINS` | Exact dev origin | Exact active production origins; code allowlist also needs tightening |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Dev OAuth Web client | Production client with approved callback/branding |
| `RESEND_API_KEY`, `AUTH_EMAIL_FROM` | Scoped dev sending credentials and verified sender | Verified production sender and delivery monitoring |
| `STRIPE_MODE` | `test` | Keep `test` until live checkout code is implemented and approved |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Sandbox key and dev endpoint secret | Environment-specific keys; never reuse a CLI listener secret for a deployed endpoint |
| `STRIPE_CHECKOUT_ENABLED`, `STRIPE_WALLET_ENABLED` | Explicitly set for sandbox acceptance testing | Review together; disabling Stripe must not expose legacy mock purchases |
| `STRIPE_CONNECT_COUNTRIES` | Initially `SG` | Only provider-approved launch countries; no assumption of worldwide payouts |
| `STRIPE_PAYOUT_CONTROLS_ENABLED` | Keep `false` until withdrawal tests pass | Separate operational readiness decision |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Dev public build argument | Existing public key in `fly.toml`; preserve matching runtime private key |
| `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Dev runtime values | Preserve production signing identity |

`NEXT_PUBLIC_*` values are public and may be compiled into the browser bundle. They are not a place for credentials. Inspect remaining environment usage before release; this table is not a replacement for a complete inventory.

Fly can import runtime secrets from protected stdin with staging, for example `fly secrets import --stage --app talerooms-dev`. Staged values take effect on a subsequent deployment. Do not paste secrets into tracked files, chat, logs or command history. Inspect names with `fly secrets list`, not values. See [Fly secrets](https://fly.io/docs/apps/secrets/).

### Google signup and verification email

1. Register the dev HTTPS origin and exact callback `https://talerooms-dev.fly.dev/api/auth/callback/google` on the dev Web client. Use configured test users while the Google app is in testing.
2. Before production cutover, register `https://talerooms.com` and `https://talerooms.com/api/auth/callback/google` on the production Web client. Complete branding, authorized domain, support/privacy/terms and audience settings as applicable. Retain the existing Fly callback during transition.
3. Make the apex canonical; add a `www` OAuth callback only if that host will actually handle OAuth instead of redirecting before login starts. Test redirect URI matching end to end.
4. Verify a Resend sending domain. A subdomain such as `mail.talerooms.com` can separate sending records from the main domain's mailbox records. Use the exact DNS records supplied by Resend and an authenticated `AUTH_EMAIL_FROM`; a new Gmail account is not required merely to send application email.
5. Preserve existing MX/TXT records; avoid duplicate SPF records on the same hostname. Verify DKIM/SPF and plan DMARC deliberately. Check delivered mail, spam placement, bounce/failure handling and resend limits using real dev test inboxes.
6. Test password signup, verification OTP, Google signup/login, account linking and existing-account verification grace behavior. Do not enable local-test email delivery in deployed environments.

Sessions on `talerooms.fly.dev` will not automatically become sessions on `talerooms.com`. Expect users to sign in again. New-domain push subscriptions also need to be established on that origin; keep VAPID keys consistent.

## 4. Production-readiness code work still pending

These are findings to address and verify, not changes implemented by this document:

- **Canonical URLs:** `src/app/layout.tsx`, `src/app/robots.ts`, `src/app/sitemap.ts` and the story Open Graph image still reference `talerooms.fly.dev`. Introduce consistent environment-aware URLs before domain launch and prevent dev content from indexing.
- **Auth origins:** `src/lib/auth.ts` unconditionally allows localhost and `*.trycloudflare.com`. Limit those to development and use exact environment-specific deployed origins. Setting an environment allowlist alone does not remove the current hardcoded entries.
- **Redirect policy:** implement and test `www` → apex behavior, preserving path/query. DNS aliases do not perform HTTP redirects. Treat old auth callbacks and Stripe webhook POST routes explicitly; do not blindly redirect these during migration.
- **Health endpoint:** retain a meaningful database readiness check and 200/503 status, but remove publicly exposed database versions and raw exception details. Keep sanitized operational detail in server logs.
- **Container permissions:** the runtime currently runs as root so the entrypoint can fix the upload volume's `lost+found`. Review dropping privileges after necessary initialization and test upload/restart permissions; do not assume the image already runs as its created `nextjs` user.
- **Dependencies and access:** review dependency/security findings, secret access, operator access and logging. Do not log OTPs, keys, payment details or private story content.
- **Operations:** establish monitoring, backup ownership, restore evidence and user-facing support/privacy/terms/refund information appropriate to the enabled features.

Read the relevant local Next.js guide in `node_modules/next/dist/docs/` before implementing framework changes, per `AGENTS.md`.

## 5. Backups and database safety

The database is self-managed. Fly volume snapshots supplement backups; they are not evidence of an application-consistent, tested recovery. Check actual snapshot schedules/retention rather than relying on comments in old configuration. See [Fly volume snapshots](https://fly.io/docs/volumes/snapshots/).

Before a production release:

- Record the current image, Git revision, Fly config, secret names/versions and feature flags in protected operational records. Never export secrets into the repository.
- Take a logical database backup using a compatible Postgres client, including required schema/data and a documented extension/role restore procedure. Store it encrypted outside the database machine with defined retention and access controls.
- Back up `/app/public/uploads` separately. Coordinate a write pause/checkpoint if necessary so database file references and uploaded files can be restored together.
- Restore both into an isolated environment and verify login, published/private stories, references, uploads and payment records. Set recovery-time and acceptable-data-loss targets based on this rehearsal.
- Check database/upload volume space, memory and backup age. One database machine and one web machine remain single points of failure.

**Do not replay every `db/*.sql` file against an existing database.** There is no automated migration ledger/release runner today, and historical migrations are not all safe to repeat. The current UI batch adds no SQL migration. For future schema releases, identify only pending migrations, back up first, use `psql -v ON_ERROR_STOP=1`, and review locking/backward compatibility. Prefer expand/contract changes so the previous app image remains usable.

A fresh disaster-recovery environment must be restored from the reviewed backup/baseline, not an unreviewed dump of a developer laptop. Move uploads to shared object storage before scaling web machines across independent disks; assess database replication or a managed service separately.

## 6. Review, push and validate the dev candidate

Run from the repository root on the intended candidate revision:

```bash
npm ci
npm test
npm run lint
npx tsc --noEmit
npm run build
```

For opt-in database integration coverage, use **only an isolated test database** configured locally, inspect `.env.local`'s target privately, then run:

```bash
npm run test:payments:local
```

The integration suite includes mock/provider-boundary tests; it does not replace a real Stripe sandbox transaction. Never point it at the public app's database.

The previous local UI pass recorded **199 passing tests**, with **14 opt-in database tests skipped**, plus lint, TypeScript and build success. Responsive checks covered 1280px, 390px and 320px. Details and limitations: [UI QA report](UI_QA_2026-10-18.md). Re-run on the final candidate; those results do not certify a deployed environment or live money.

Before pushing, inspect `git status`, `git diff --check`, the diff and staged file list. Include the intended UI code, new components/tests and documentation. Exclude credentials, environment files, uploaded data, private screenshots and unrelated `artifacts/` logo work. Commit the reviewed candidate and push its chosen branch; record the SHA. GitHub push does not itself guarantee a Fly deploy: inspect any workflow before relying on automation.

Deploy dev using the explicit dev config from section 2, from that exact commit. Record the deployed image digest/release and confirm the build did not include additional local changes.

### Dev acceptance checklist

- [ ] Health checks pass and logs show no startup, database, embedding or upload permission errors.
- [ ] Signup, OTP delivery/resend, Google login, logout, profile editing and protected-action verification work on the deployed dev origin.
- [ ] Reader/author permissions hold for drafts, private chapters, purchases and edits; a signed-out user cannot read protected content.
- [ ] Feed Stories/Community, search, profile Thoughts, Library/collections, writer/editor, story toolbar, notifications, navigation, missing-page recovery and Wallet pass at desktop, 390px and 320px widths.
- [ ] Check keyboard focus, menu dismissal, long names/URLs/titles, empty/error/loading states, dropdown arrows, tap sizes and overflow. Include a physical iPhone/Safari and Android browser pass before broad launch.
- [ ] Upload avatar/wallpaper, restart the dev app and verify persistence. Test story publishing and embedding generation without out-of-memory failures.
- [ ] Complete the real Stripe sandbox flow below; record provider event/order references privately.
- [ ] Refresh/restart, revisit purchased content and test another reader: access and balances must remain correctly scoped.
- [ ] Remove synthetic QA data and unused test credentials after evidence is recorded. No test content should be created in production.

## 7. Stripe sandbox acceptance and live-money gate

Retain the existing Connect architecture. Readers pay through Checkout; authors complete Stripe onboarding for receiving payments. Readers do not need author payout setup.

For dev, use a separate Stripe sandbox where available, an environment-specific connected-account webhook endpoint at `https://talerooms-dev.fly.dev/api/wallet/webhook`, and its signing secret. Connect account IDs and payment records must belong to that environment. Do not replay production events into dev.

Subscribe to the events currently handled by the route:

- `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`.
- `account.updated`, `balance.available`, `payout.created`, `payout.updated`, `payout.paid`, `payout.failed`, `payout.canceled`.

Execute with actual provider APIs/hosted pages, not mock handlers:

1. A new dev author signs up, completes Stripe sandbox identity/bank setup, returns to Wallet and reaches verified charge/payout readiness.
2. The author publishes a story with a priced private chapter in SGD.
3. A different dev reader signs up, checks out using Stripe's documented test payment details, and returns to the app.
4. Verify the signed webhook is delivered successfully, the stored order matches the provider's account/amount/currency, and the reader gets the correct persisted entitlement. A success redirect alone must not grant access.
5. Confirm author earnings/readiness reflect provider state; distinguish pending from settled funds. Review withdrawal behavior with controls disabled before separately testing any enabled payout controls.
6. Exercise cancellation, decline, retry, duplicate/replayed events, unauthorized purchase/access, wrong amounts/accounts, stale readiness and refresh after completion. Verify no duplicate order/grant/withdrawal and no unpaid entitlement.

A successful provider purchase/payout has **not** been established by the local UI QA report. Record results honestly; unresolved provider readiness is a release blocker for promising working paid access.

### Live payments remain blocked pending separate work

`src/lib/payments/orders.ts` requires `STRIPE_MODE=test`, a test secret key and test-mode orders/events. **Do not switch to live keys or `STRIPE_MODE=live` to launch payments.**

Before a live-money release: implement/review live order and event handling; complete the platform's live activation and author onboarding; decide fees (current 0% is a sandbox placeholder), supported currencies/countries, settlement and withdrawal policy; verify refunds, disputes, reconciliation and recovery; validate webhook idempotency and support procedures; and run a controlled live purchase/refund with separately authorized real funds. Recurring Stripe subscriptions are not implemented and must not be advertised as available.

For the production domain cutover, initially keep the existing working `talerooms.fly.dev/api/wallet/webhook` endpoint unchanged. Browser return URLs can use the canonical domain independently. The verifier currently accepts one signing secret: migrating the webhook hostname later needs a planned overlap/drain or dual-secret implementation, not an uncoordinated endpoint/secret swap.

## 8. Configure talerooms.com after dev sign-off

Proposed canonical URL: **https://talerooms.com**, with `www` redirecting to it. Keep the current public Fly hostname usable during the transition.

Re-read current IPs and certificate-specific instructions immediately before changing DNS:

```bash
fly ips list --app talerooms
fly certs setup talerooms.com --app talerooms
fly certs setup www.talerooms.com --app talerooms
```

The two certificates are already attached; do not blindly add duplicates. At the authoritative DNS provider, save the current zone and lower TTL in advance where possible. After approval, replace conflicting parking/forwarding records with the values Fly currently reports:

| DNS record | Name | Value observed on review date |
| --- | --- | --- |
| A | `@` | `66.241.125.152` |
| AAAA | `@` | `2a09:8280:1::12b:dae9:0` |
| CNAME | `www` | Exact target from `fly certs setup www.talerooms.com` |
| Validation TXT/CNAME | As supplied by Fly | Exact per-host verification value, if required |

Do not invent a CNAME validation target or use an apex CNAME unless the DNS provider explicitly supports the intended flattening. Preserve mail/Resend records. Fly supports DNS validation before traffic cutover; use its certificate-specific instructions to obtain HTTPS first where possible. Keep verification records needed for renewal. See [Fly custom domain setup](https://fly.io/docs/networking/custom-domain/).

```bash
fly certs check talerooms.com --app talerooms
fly certs check www.talerooms.com --app talerooms
fly certs show talerooms.com --app talerooms
fly certs show www.talerooms.com --app talerooms
dig +short talerooms.com A
dig +short talerooms.com AAAA
dig +short www.talerooms.com CNAME
```

Require valid certificates for both names, correct public resolution and tested canonical redirect behavior. Allow for DNS caches; elapsed time alone is not proof of completion. Complete OAuth, email, canonical metadata and auth-origin changes before inviting users to the new URL.

## 9. Production promotion and rollback

This stage follows dev acceptance and the user's production decision. Do not deploy the dev database configuration, sandbox fixtures or dev secrets to production.

1. Back up and rehearse recovery (section 5). Record the current production image and exact configuration again; v45 below is only the review-date baseline.
2. Promote the tested revision. Prefer the tested immutable image when all compiled public settings match. If environment-specific public values differ, rebuild from the same SHA with the intended production build args, record the new digest and verify that artifact before cutover.
3. Stage only intended runtime secret/base-URL changes. Preserve the production database URL, auth secret and VAPID keypair. Sequence base-URL changes with OAuth registration and verified DNS/TLS.
4. Deploy with the existing root production config, keep one machine and allow a maintenance window; the current volume architecture does not promise zero downtime.

```bash
fly releases --app talerooms --image
fly status --app talerooms
# Only after production approval, from the approved revision/config:
fly deploy --config fly.toml --app talerooms --ha=false
fly checks list --app talerooms
curl --fail --silent --show-error https://talerooms.com/api/health
```

5. Verify HTTPS/redirects, signup/OTP/Google login, public/private story access, uploads, search/publishing, profile, Library, Wallet and the currently enabled payment mode on desktop/mobile. Confirm metadata, sitemap and robots contain the intended production host. Verify existing accounts/content survive.
6. Monitor app/database errors, memory, disk, uptime, email failures, webhook retries and payment reconciliation. Configure alerts and backup-freshness checks, plus billing alerts; inspect logs without publishing secrets/user data.

See [Fly deployment behavior](https://fly.io/docs/launch/deploy/). Capture a release record with SHA, image digest, release number, migration list, flag changes, acceptance evidence and rollback owner.

### Rollback procedure

Stop promotion/cutover if health checks, login, persistence, authorization or enabled checkout fails. Restore service before continuing feature work. Re-deploy the recorded last-good image with the corresponding known-good config:

```bash
# Review-date v45 baseline; re-capture before the next release.
fly deploy --config fly.toml --app talerooms --ha=false \
  --image registry.fly.io/talerooms:deployment-01M54R7XFW3GR2QSTCWXQQDAD8
```

An image rollback does **not** roll back database changes, secrets, volumes, DNS or provider configuration. Restore the matching base URL/allowed callbacks if reverting domain behavior; preserve a working host during DNS propagation. Avoid rolling back to parked DNS as a service-recovery strategy. Keep webhook deliveries compatible and replay failed events after reconciliation. Never drop production tables or overwrite current data just to match an older image; use the reviewed database recovery plan if data restoration is necessary.

## 10. What we need before proceeding

- [x] Dev resource names/configuration and isolated schema bootstrap prepared; see [dev setup](../deploy/dev/README.md).
- [x] Fly access/billing available; dev app/database/volumes provisioned.
- [ ] Dev Google OAuth client, Resend sender/access and Stripe sandbox webhook configured through protected settings.
- [x] Candidate reviewed and pushed; explicit dev deployment completed (record below).
- [ ] Dev desktop/mobile and actual Stripe sandbox acceptance evidence recorded.
- [ ] Production-readiness fixes, backup/restore drill and release decision completed.
- [ ] Access to `talerooms.com` authoritative DNS and production provider dashboards ready.
- [ ] Production DNS/TLS/auth/email cutover completed and monitored.
- [ ] Live-money implementation and validation completed separately before accepting real payments.

The initial documentation pass performed read-only inspection only. The user subsequently authorized GitHub push and an isolated dev deployment; the dev rollout updates below record that work. Production deployment and domain cutover remain separate steps.

## Dev rollout — 18 October 2026

- Provisioned `talerooms-dev` and private `talerooms-dev-pg` in Singapore, with independent upload/database volumes and generated database/auth/VAPID secrets.
- Installed the reviewed schema-only baseline and 12 current-schema reference genres. Verified bootstrap is atomic and rejects a repeat installation. No production account/content/payment rows were copied.
- Created a separate Stripe sandbox Connect webhook at `https://talerooms-dev.fly.dev/api/wallet/webhook`; its signing secret is installed only on dev. Existing Stripe sandbox API access and the Resend sender are reused, rather than claiming full provider-account isolation.
- Dev uses exact-origin auth and build/runtime crawler exclusion. Google OAuth setup is pending; Google credentials are not installed until the dev callback is configured.
- Candidate checks: 201 tests passed, 14 opt-in database tests skipped; lint, TypeScript and the dev production build passed.
- GitHub code candidate: `fadfbf5` (UI/infrastructure change `34019b4`, followed by the Fly config-relative Dockerfile path correction).
- Deployed URL: **https://talerooms-dev.fly.dev**. Fly release **v1**, machine `7845746cd79d18`, image `registry.fly.io/talerooms-dev:dev-fadfbf5`, digest `sha256:734391ad05a652a609852ed5031816f091bb0b975c9cf83bb9eca22d54177107`. Health check passing. Dev database reports Postgres 17.11 and pgvector 0.8.7.
- **40 deployed HTTPS smoke assertions passed:** public pages, database readiness, crawler exclusions/empty sitemap, friendly missing page, protected routes, foreign-origin rejection, real password login/session/logout, signed-in Feed/Library/Wallet/Write/Notifications rendering, thought/collection writes and read-after-write, active Stripe sandbox configuration, mock-purchase rejection and webhook signature boundaries. The positive webhook check used a locally signed ignored test event; it is not proof of a completed provider purchase or Stripe-originated delivery.
- Deployed login page checked in the browser at 1280/390/320px: no horizontal overflow; `noindex, nofollow` metadata present. Full interactive UI checks remain the earlier local QA evidence, not a claim that every signed-in dev page was visually re-tested.
- Removed the disposable verified QA account and cascading posts/collections after checking login/data writes; final dev counts are zero users, zero posts and zero collections. Private temporary credentials were removed after setup.
- Google OAuth is pending the dev callback/client setup; its button is disabled rather than showing a broken login flow. Email service credentials are configured, but delivery was not re-tested in this rollout. Real Stripe sandbox purchase/settlement remains pending.
- Production was verified unchanged: `talerooms` remains **v45**, image `deployment-01M54R7XFW3GR2QSTCWXQQDAD8`, health passing. No production database or `talerooms.com` DNS changes.
