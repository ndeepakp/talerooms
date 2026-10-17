import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Local sandbox only. Keep the key out of argv and the signing secret out of logs.
if ((process.env.STRIPE_MODE || 'test') !== 'test' || !process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_')) {
  console.error('Local webhook forwarding requires STRIPE_MODE=test and a sandbox secret key.');
  process.exit(1);
}
const envFile = fileURLToPath(new URL('../.env.local', import.meta.url));
const cli = fileURLToPath(new URL('../node_modules/@stripe/cli/bin/shim.js', import.meta.url));
const child = spawn(process.execPath, [cli, 'listen',
  '--forward-connect-to', 'http://localhost:3000/api/wallet/webhook',
  '--events', 'account.updated,balance.available,payout.created,payout.updated,payout.paid,payout.failed,payout.canceled,checkout.session.completed,checkout.session.async_payment_succeeded,checkout.session.async_payment_failed,checkout.session.expired',
  '--color', 'off',
], { env: { ...process.env, STRIPE_API_KEY: process.env.STRIPE_SECRET_KEY }, stdio: ['ignore', 'pipe', 'pipe'] });
let saved = false;
function report(line) {
  const secret = line.match(/whsec_[A-Za-z0-9]+/)?.[0];
  if (secret && !saved) {
    const content = readFileSync(envFile, 'utf8');
    const setting = `STRIPE_WEBHOOK_SECRET=${secret}`;
    writeFileSync(envFile, /^STRIPE_WEBHOOK_SECRET=.*$/m.test(content)
      ? content.replace(/^STRIPE_WEBHOOK_SECRET=.*$/m, setting)
      : `${content.trimEnd()}\n${setting}\n`);
    saved = true;
    console.log('Stripe sandbox listener ready. Signing secret saved privately to .env.local.');
  }
  if (!secret && line.trim()) console.log(line.replace(/(?:sk|pk)_(?:test|live)_[A-Za-z0-9]+/g, '[redacted]'));
}
for (const stream of [child.stdout, child.stderr]) {
  let buffer = '';
  stream.setEncoding('utf8');
  stream.on('data', chunk => {
    buffer += chunk;
    const lines = buffer.split(/\r?\n/); buffer = lines.pop() || '';
    for (const line of lines) report(line);
  });
  stream.on('end', () => { if (buffer) report(buffer); });
}
child.on('error', () => { console.error('Unable to start Stripe CLI. Run npm install first.'); process.exitCode = 1; });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('exit', code => { process.exitCode = code ?? 0; });
