# Isolated Fly dev environment

Run commands from the repository root. Web: `talerooms-dev`; private database: `talerooms-dev-pg`; region: `sin`. Production remains `talerooms` / `talerooms-pg`.

```bash
fly deploy --config deploy/dev/db/fly.toml --app talerooms-dev-pg --ha=false
# First install only, after setting the database password in Fly:
node scripts/bootstrap-dev-db.mjs
fly deploy --config deploy/dev/fly.toml --app talerooms-dev --ha=false
```

The schema-only baseline was exported from the local Postgres 17.10 database on 2026-10-18, reflecting the application through migration 0051. It contains no user rows, credentials or payment records. Its SHA-256 is recorded in `deployment_schema_baselines` on installation. The pg_dump `restrict` token is a psql execution guard, not a credential. `genres.sql` supplies reference data including the current schema's required slugs; the historical `0025` seed does not include them.

Bootstrap targets only `talerooms-dev-pg`, checks that the public schema has no tables, and runs schema, reference seed and baseline marker in one transaction with error-stop enabled. A second run must fail without changing data. Future migrations need their own reviewed tracking/upgrade process; do not reset an existing dev database by replaying this baseline.

Use only sandbox Stripe credentials and this environment's webhook signing secret. Secrets are runtime Fly settings, never values in these files. Auth and VAPID keys are separate from production. Resend currently uses the existing configured sending service; a separately scoped dev key remains desirable. The Stripe sandbox platform credential is currently shared with local testing, with a separate dev endpoint secret and isolated database/account mappings. A fully separate Stripe sandbox can replace it later.

The dev build passes `DEPLOYMENT_ENV=dev` at build and runtime, blocks crawling/indexing and emits no sitemap entries. These controls are not access control. Trusted auth origin is the exact dev Fly hostname. Google sign-in stays unavailable until its OAuth callback is configured and credentials are installed on this app.

Full release, provider setup and rollback instructions: [deployment runbook](../../docs/deploy-fly.md).
