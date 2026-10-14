import { WalletError } from './types';
// Initial settlement currencies match the currencies supported by Talerooms.
// Additional payout currencies need explicit exponent/provider validation.
const EXPONENTS: Record<string, number> = { inr: 2, usd: 2, eur: 2, gbp: 2, sgd: 2, aud: 2, cad: 2, jpy: 0 };
export function parseAmount(value: unknown, currency: string): number {
  const exponent = Object.hasOwn(EXPONENTS, currency) ? EXPONENTS[currency] : undefined;
  if (exponent === undefined) throw new WalletError(400, 'This settlement currency is not supported for withdrawals yet.');
  if (typeof value !== 'string' || value.length > 20 || !/^\d+(\.\d+)?$/.test(value)) throw new WalletError(400, 'Enter a valid amount.');
  const [whole, fraction = ''] = value.split('.');
  if (fraction.length > exponent) throw new WalletError(400, `Use no more than ${exponent} decimal places.`);
  const amount = Number(whole + fraction.padEnd(exponent, '0'));
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new WalletError(400, 'Enter a positive amount within the supported limit.');
  return amount;
}
export function formatMoney(amount: number, currency: string) {
  // Never infer Stripe's API exponent from Intl: ISK/UGX and some payout
  // currencies have provider-specific rules. Unsupported currencies stay with Stripe.
  if (!Object.hasOwn(EXPONENTS, currency)) return `${currency.toUpperCase()} — view in Stripe`;
  const exponent = EXPONENTS[currency];
  return new Intl.NumberFormat('en', { style: 'currency', currency: currency.toUpperCase() }).format(amount / 10 ** exponent);
}
export function supportedCurrency(currency: string) { return Object.hasOwn(EXPONENTS, currency); }
