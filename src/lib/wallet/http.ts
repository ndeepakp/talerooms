import { requireSession } from '@/lib/http';
import { sessionAccountState } from '@/lib/account-session';
import { WalletError } from './types';
import { configured, walletOrigin } from './policy';
import { WalletService } from './service';
import { walletStore } from './store';
import { stripeWalletProvider } from './provider';
import { limitedText } from './limits';
export function service() {
  if (!configured()) throw new WalletError(503, 'Payout setup is not available yet.');
  return new WalletService(walletStore, stripeWalletProvider());
}
export async function mutation(request: Request) {
  if (request.headers.get('origin') !== walletOrigin()) throw new WalletError(403, 'Open Talerooms to continue.');
  const session = await requireSession();
  if (!(await sessionAccountState(session.user.id))?.emailVerified) throw new WalletError(403, 'Verify your email before continuing.');
  if (Date.now() - new Date(session.session.createdAt).getTime() > 30 * 60_000) throw new WalletError(403, 'Sign out and sign in again before continuing.');
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new WalletError(400, 'Send a JSON request.');
  const text = await limitedText(request, 2048);
  if (text.length > 2048) throw new WalletError(413, 'Request is too large.');
  let body;
  try { body = JSON.parse(text); } catch { throw new WalletError(400, 'Invalid request.'); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new WalletError(400, 'Invalid request.');
  return { session, body };
}
export function walletRoute(handler: (request: Request) => Promise<Response>) {
  return async (request: Request) => {
    try { return await handler(request); }
    catch (error) {
      const known = error instanceof WalletError || (error instanceof Error && error.name === 'ApiError');
      // Never log SDK objects, onboarding links or banking details.
      if (!known) console.error('Wallet operation failed', error instanceof Error ? error.name : 'unknown');
      return Response.json({ error: known ? (error as Error).message : 'Wallet is temporarily unavailable. Please try again.' }, { status: known ? (error as WalletError).status : 503, headers: { 'Cache-Control': 'no-store' } });
    }
  };
}
export function walletJson(data: unknown, status = 200) { return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } }); }
