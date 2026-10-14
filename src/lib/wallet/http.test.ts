import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ session: vi.fn(), state: vi.fn() }));
vi.mock('@/lib/http', () => ({ requireSession: mocks.session }));
vi.mock('@/lib/account-session', () => ({ sessionAccountState: mocks.state }));
import { mutation, walletRoute } from './http';
import { WalletError } from './types';
function request(body = '{}', origin = 'http://localhost:3000', contentType = 'application/json') {
  return new Request('http://localhost:3000/api/wallet/withdrawals', { method: 'POST', headers: { origin, 'content-type': contentType }, body });
}
beforeEach(() => {
  vi.stubEnv('BETTER_AUTH_URL', 'http://localhost:3000');
  mocks.session.mockResolvedValue({ user: { id: 'author', email: 'author@example.test', emailVerified: true }, session: { createdAt: new Date() } });
  mocks.state.mockResolvedValue({ emailVerified: true });
});
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
describe('wallet mutation security', () => {
  it('checks current verification rather than stale session or legacy grace', async () => {
    mocks.state.mockResolvedValue({ emailVerified: false, verificationGraceUntil: new Date(Date.now() + 86400_000) });
    await expect(mutation(request())).rejects.toThrow('Verify your email');
  });
  it('requires a recent sign-in', async () => {
    mocks.session.mockResolvedValue({ user: { id: 'author' }, session: { createdAt: new Date(Date.now() - 31 * 60_000) } });
    await expect(mutation(request())).rejects.toThrow('sign in again');
  });
  it('rejects cross-origin and absent-origin submissions before authentication', async () => {
    await expect(mutation(request('{}', 'https://evil.example'))).rejects.toThrow('Talerooms');
    await expect(mutation(request('{}', ''))).rejects.toThrow('Talerooms'); expect(mocks.session).not.toHaveBeenCalled();
  });
  it('rejects unsupported bodies and accepts a verified current session', async () => {
    await expect(mutation(request('[]'))).rejects.toThrow('Invalid'); await expect(mutation(request('x'))).rejects.toThrow('Invalid');
    await expect(mutation(request('{}', 'http://localhost:3000', 'text/plain'))).rejects.toThrow('JSON');
    await expect(mutation(request(JSON.stringify({ x: 'a'.repeat(2048) })))).rejects.toThrow('large');
    expect((await mutation(request())).session.user.id).toBe('author');
  });
  it('does not expose provider errors and never caches financial responses', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const handler = walletRoute(async () => { throw new Error('sk_live_secret bank details'); });
    const response = await handler(request()); expect(response.status).toBe(503); expect(JSON.stringify(await response.json())).not.toContain('secret');
    expect(log).toHaveBeenCalledWith('Wallet operation failed', 'Error'); expect(response.headers.get('cache-control')).toBe('no-store'); log.mockRestore();
    const blocked = walletRoute(async () => { throw new WalletError(409, 'Not ready'); }); expect((await blocked(request())).status).toBe(409);
  });
});
