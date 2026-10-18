// Fresh isolated dev database only. Refuses to overwrite any existing tables.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const schema = readFileSync(new URL('../deploy/dev/schema.sql', import.meta.url), 'utf8');
const genres = readFileSync(new URL('../deploy/dev/genres.sql', import.meta.url), 'utf8');
const digest = createHash('sha256').update(schema).digest('hex');
const guard = `DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public') THEN
    RAISE EXCEPTION 'Dev bootstrap requires an empty public schema; existing data was not changed';
  END IF;
END $$;\n`;
const marker = `CREATE TABLE public.deployment_schema_baselines (
  schema_sha256 text PRIMARY KEY, description text NOT NULL,
  installed_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.deployment_schema_baselines(schema_sha256,description)
VALUES ('${digest}', 'Schema-only local baseline through 0051; 2026-10-18');\n`;
const result = spawnSync('fly', [
  'ssh', 'console', '--app', 'talerooms-dev-pg', '--quiet',
  '--command', 'psql -U postgres -d talerooms -v ON_ERROR_STOP=1 --single-transaction',
], { input: guard + schema + '\nSET search_path = public;\n' + genres + '\n' + marker, encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 });
if (result.status !== 0) {
  console.error(result.stderr || result.error?.message || 'Dev bootstrap failed');
  process.exit(result.status || 1);
}
console.log(`Dev schema and reference genres installed. SHA-256: ${digest}`);
