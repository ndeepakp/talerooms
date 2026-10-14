import { WalletError, type Mode, type Source } from './types';
export { parseAmount, formatMoney, supportedCurrency } from './money';
export function requestKey(value: unknown): string {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) throw new WalletError(400, 'A valid request reference is required.');
  return value.toLowerCase();
}
export function sourceType(value: unknown): Source {
  if (value !== 'card' && value !== 'bank_account' && value !== 'fpx') throw new WalletError(400, 'Choose a valid balance source.');
  return value;
}
export function walletMode(): Mode {
  const value = process.env.STRIPE_MODE || 'test';
  if (value !== 'test' && value !== 'live') throw new WalletError(503, 'Wallet configuration needs attention.');
  return value;
}
export function approvedCountries(): string[] {
  return (process.env.STRIPE_CONNECT_COUNTRIES || '').split(',').map(s => s.trim().toUpperCase()).filter(s => /^[A-Z]{2}$/.test(s));
}
export function configured() {
  const mode = walletMode();
  return process.env.STRIPE_WALLET_ENABLED === 'true' && !!process.env.STRIPE_SECRET_KEY?.startsWith(`sk_${mode}_`) && approvedCountries().length > 0;
}
export function walletOrigin(): string {
  const url = new URL(process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) throw new WalletError(503, 'A secure wallet address is required.');
  return url.origin;
}
