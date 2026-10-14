import { sql } from '@/lib/db';
import { WalletError } from './types';
export async function limitWallet(userId: string, action: 'read' | 'onboarding' | 'withdraw') {
  const duration = action === 'onboarding' ? 3600_000 : 60_000;
  const maximum = action === 'onboarding' ? 5 : action === 'read' ? 30 : 10;
  const window = new Date(Math.floor(Date.now() / duration) * duration);
  const key = `${action}:${userId}`;
  const [row] = await sql`INSERT INTO wallet_rate_limits(key,window_start,requests) VALUES (${key},${window},1)
    ON CONFLICT(key) DO UPDATE SET window_start=EXCLUDED.window_start,
      requests=CASE WHEN wallet_rate_limits.window_start=EXCLUDED.window_start THEN LEAST(wallet_rate_limits.requests+1,${maximum+1}) ELSE 1 END
    RETURNING requests`;
  if (row.requests > maximum) throw new WalletError(429, 'Too many wallet requests. Please wait and try again.');
}
export async function limitedText(request: Request, limit: number) {
  if (Number(request.headers.get('content-length')) > limit) throw new WalletError(413, 'Request is too large.');
  if (!request.body) return '';
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = '';
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      bytes += next.value.byteLength;
      if (bytes > limit) { await reader.cancel(); throw new WalletError(413, 'Request is too large.'); }
      text += decoder.decode(next.value, { stream: true });
    }
    return text + decoder.decode();
  } finally { reader.releaseLock(); }
}
