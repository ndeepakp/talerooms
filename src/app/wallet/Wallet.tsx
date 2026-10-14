'use client';
import { useCallback, useEffect, useState } from 'react';
import { formatMoney, supportedCurrency } from '@/lib/wallet/money';

type Withdrawal = { id: string; requestKey: string; amount: number; currency: string; source: string; status: string; createdAt: string; arrivalAt: string | null };
export type WalletData = {
  configured: boolean; mode: string; countries: string[]; account: { country: string } | null; canWithdraw: boolean;
  snapshot: null | {
    chargesEnabled: boolean; payoutsEnabled: boolean; schedule: string;
    banks: { currency: string; label: string }[];
    available: { currency: string; amount: number; sources: Record<string, number> }[];
    pending: { currency: string; amount: number }[];
    transactions: { id: string; currency: string; amount: number; fee: number; net: number; kind: string; status: string; occurredAt: string; availableAt: string }[];
  }; withdrawals: Withdrawal[];
};
const dates = (value: string) => new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(value));
const statuses: Record<string, string> = { reserved: 'Checking request', unknown: 'Checking request', pending: 'Processing', in_transit: 'On its way', paid: 'Paid', failed: 'Failed', canceled: 'Canceled' };
class WalletRequestError extends Error { constructor(message: string, public status: number) { super(message); } }
async function api(path: string, body?: unknown) {
  const response = await fetch(path, { cache: 'no-store', ...(body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}) });
  const result = await response.json();
  if (!response.ok) throw new WalletRequestError(result.error || 'Unable to load your wallet.', response.status);
  return result;
}
export function Wallet({ initialData }: { initialData?: WalletData }) {
  const [data, setData] = useState<WalletData | null>(initialData || null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [country, setCountry] = useState(initialData?.account?.country || '');
  const [choice, setChoice] = useState('');
  const [amount, setAmount] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [attempt, setAttempt] = useState<{ key: string; amount: string; currency: string; source: string } | null>(null);
  const refresh = useCallback(async () => {
    const result = await api('/api/wallet');
    setData(result); setCountry(result.account?.country || result.countries[0] || '');
  }, []);
  useEffect(() => {
    if (initialData) return;
    let active = true;
    api('/api/wallet').then(result => {
      if (active) { setData(result); setCountry(result.account?.country || result.countries[0] || ''); }
    }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [initialData]);
  const balances = data?.snapshot?.available || [];
  const choices = balances.flatMap(balance => Object.entries(balance.sources).filter(([, value]) => value > 0 && supportedCurrency(balance.currency)).map(([source, available]) => ({ currency: balance.currency, source, available: Math.min(available, balance.amount), key: `${balance.currency}:${source}` })));
  const selected = choices.find(item => item.key === choice) || choices[0];
  const destination = data?.snapshot?.banks.find(bank => bank.currency === selected?.currency);
  async function run(action: () => Promise<void>) {
    setBusy(true); setError(''); setNotice('');
    try { await action(); } catch (e) { setError(e instanceof Error ? e.message : 'Please try again.'); }
    finally { setBusy(false); }
  }
  async function withdraw(input: NonNullable<typeof attempt>) {
    setAttempt(input);
    let result;
    try { result = await api('/api/wallet/withdrawals', input); }
    catch (error) {
      if (error instanceof WalletRequestError && error.status < 500) { setAttempt(null); setConfirm(false); }
      throw error;
    }
    setAttempt(null); setConfirm(false); setAmount('');
    setNotice(`Withdrawal ${statuses[result.withdrawal.status]?.toLowerCase() || 'submitted'}.`);
    await refresh();
  }
  return <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div><p className="mb-2 text-sm font-medium uppercase tracking-widest text-muted">For your next chapter</p><h1 className="font-serif text-4xl text-ink sm:text-5xl">Your author wallet</h1><p className="mt-3 max-w-xl text-muted">Your earnings, from story to bank account.</p></div>
      <button type="button" disabled={busy} className="min-h-11 rounded-full border border-ui px-5 text-sm text-ink disabled:opacity-50" onClick={() => run(refresh)}>Refresh wallet</button>
    </div>
    {error && <div role="alert" className="mb-6 rounded-xl border border-ui bg-surface-raised p-4 text-danger">{error}{!data && <button onClick={() => run(refresh)} className="ml-3 min-h-11 underline">Try again</button>}</div>}
    {notice && <p role="status" className="mb-6 rounded-xl border border-ui p-4 text-success">{notice}</p>}
    {!data && !error && <p role="status" className="py-12 text-muted">Loading your wallet…</p>}
    {data && <>
      {data.mode === 'test' && <p className="mb-6 rounded-xl bg-surface-soft px-4 py-3 text-sm text-muted"><strong className="text-ink">Test mode.</strong> No real earnings or bank withdrawals.</p>}
      <section className="mb-6 rounded-2xl border border-ui bg-surface-raised p-5 sm:p-7" aria-labelledby="setup-title">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0 max-w-xl"><h2 id="setup-title" className="font-serif text-2xl text-ink">{!data.configured ? 'Earnings are coming soon' : !data.snapshot ? 'Set up your payouts' : data.snapshot.payoutsEnabled && data.snapshot.chargesEnabled ? 'Your payout account' : 'Finish your payout setup'}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">{!data.configured ? 'Payment setup is in progress. Your wallet will show confirmed earnings once paid purchases are connected.' : 'Stripe securely handles identity checks and bank details. Talerooms never asks you to enter bank details here.'}</p>
            {data.snapshot?.banks.map(bank => <p key={bank.currency} className="mt-2 break-words text-sm text-ink">{bank.label} · {bank.currency.toUpperCase()}</p>)}
            {data.snapshot && <p className="mt-2 text-sm text-muted">Automatic payouts: {data.snapshot.schedule}. {!data.canWithdraw && 'Withdrawals are waiting for verified payout readiness.'}</p>}
          </div>
          {data.configured && <div className="flex w-full flex-col gap-3 sm:w-auto">
            {!data.account && <label className="text-sm text-muted">Payout country<select className="mt-1 block min-h-11 w-full rounded-xl border border-ui bg-surface-raised px-3 text-ink" value={country} onChange={e => setCountry(e.target.value)}>{data.countries.map(value => <option key={value} value={value}>{new Intl.DisplayNames(['en'], { type: 'region' }).of(value)}</option>)}</select></label>}
            <button disabled={busy || !country} className="btn-primary min-h-11 rounded-full px-5 py-3 disabled:opacity-50" onClick={() => run(async () => { const result = await api('/api/wallet/onboarding', { country }); window.location.assign(result.url); })}>{data.snapshot ? 'Manage payout setup' : 'Set up with Stripe'} <span aria-hidden="true">↗</span></button>
          </div>}
        </div>
      </section>
      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        {[{ title: 'Available to withdraw', values: balances, description: 'Settled funds, after fees and any unresolved withdrawal requests.' }, { title: 'Pending earnings', values: data.snapshot?.pending || [], description: 'Still settling with Stripe. These funds cannot be withdrawn yet.' }].map(card => <section key={card.title} className="rounded-2xl border border-ui bg-surface-raised p-5 sm:p-7"><h2 className="text-sm font-medium text-muted">{card.title}</h2>
          {card.values.length ? card.values.map(value => <p key={value.currency} className="mt-3 break-words font-serif text-3xl text-ink">{formatMoney(value.amount, value.currency)}</p>) : <p className="mt-3 font-serif text-3xl text-ink">{data.snapshot ? 'No funds yet' : '—'}</p>}
          <p className="mt-3 text-sm leading-6 text-muted">{card.description}</p></section>)}
      </div>
      {data.snapshot && <section aria-labelledby="withdraw-title" className="mb-8 rounded-2xl border border-ui p-5 sm:p-7">
        <h2 id="withdraw-title" className="font-serif text-2xl text-ink">Withdraw to your bank</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Delivery depends on your bank and country. Automatic payouts remain active as your fallback. Refunds and disputes can reduce your balance.</p>
        {data.canWithdraw && selected && destination ? <form className="mt-5 max-w-lg" onSubmit={e => { e.preventDefault(); setError(''); setConfirm(true); }}>
          <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm text-muted">Balance<select disabled={busy || !!attempt} className="mt-1 min-h-12 w-full rounded-xl border border-ui bg-surface-raised px-3 text-ink" value={selected.key} onChange={e => { setChoice(e.target.value); setConfirm(false); }}>{choices.map(item => <option key={item.key} value={item.key}>{item.currency.toUpperCase()} · {item.source === 'card' ? 'Card payments' : item.source.replace('_', ' ')}</option>)}</select></label>
          <label className="text-sm text-muted">Amount ({selected.currency.toUpperCase()})<input disabled={busy || !!attempt} required inputMode="decimal" autoComplete="off" className="mt-1 min-h-12 w-full rounded-xl border border-ui bg-surface-raised px-3 text-ink" placeholder="0" value={amount} onChange={e => { setAmount(e.target.value); setConfirm(false); }} /></label></div>
          <p className="mt-3 text-sm text-muted">Up to {formatMoney(selected.available, selected.currency)} · {destination.label}</p>
          {confirm && !attempt ? <div className="mt-4 rounded-xl bg-surface-soft p-4"><p className="mb-3 text-sm text-ink">Send {amount} {selected.currency.toUpperCase()} to {destination.label}?</p><div className="flex flex-wrap gap-3"><button type="button" disabled={busy} className="btn-primary min-h-11 rounded-full px-5 py-2" onClick={() => run(() => withdraw({ key: crypto.randomUUID(), amount, currency: selected.currency, source: selected.source }))}>{busy ? 'Submitting…' : 'Confirm withdrawal'}</button><button type="button" disabled={busy} className="min-h-11 rounded-full border border-ui px-5" onClick={() => setConfirm(false)}>Cancel</button></div></div> : !attempt && <button disabled={busy} className="btn-primary mt-4 min-h-11 rounded-full px-5 py-3">Review withdrawal</button>}
        </form> : <p className="mt-4 text-sm text-muted">{data.canWithdraw ? 'No supported settled balance and matching bank account are available yet. Automatic Stripe payouts remain active.' : 'Complete payout verification before withdrawing.'}</p>}
        {attempt && <button disabled={busy} className="mt-4 min-h-11 rounded-full border border-ui px-5" onClick={() => run(() => withdraw(attempt))}>Check the same withdrawal</button>}
      </section>}
      <section className="mb-8" aria-labelledby="history-title"><h2 id="history-title" className="mb-4 font-serif text-2xl text-ink">Withdrawal history</h2>
        {!data.withdrawals.length ? <p className="rounded-2xl border border-ui p-6 text-sm text-muted">Your bank withdrawals will appear here.</p> : <ul className="divide-y divide-ui rounded-2xl border border-ui bg-surface-raised">{data.withdrawals.map(row => <li key={row.id} className="flex flex-wrap items-start justify-between gap-3 p-5"><div><p className="font-medium text-ink">{formatMoney(row.amount, row.currency)}</p><p className="mt-1 text-sm text-muted">{dates(row.createdAt)}{row.arrivalAt && ['pending', 'in_transit'].includes(row.status) && ` · Estimated arrival ${dates(row.arrivalAt)}`}</p><p className="mt-1 break-all text-xs text-muted">Reference: {row.id}</p>
        {['unknown', 'reserved'].includes(row.status) && supportedCurrency(row.currency) && <button className="mt-2 min-h-11 text-sm underline" disabled={busy} onClick={() => run(() => withdraw({ key: row.requestKey, amount: (row.amount / (row.currency === 'jpy' ? 1 : 100)).toFixed(row.currency === 'jpy' ? 0 : 2), currency: row.currency, source: row.source }))}>Check this request</button>}</div><span className="rounded-full bg-surface-soft px-3 py-2 text-sm text-ink">{statuses[row.status] || row.status}</span></li>)}</ul>}
      </section>
      <section aria-labelledby="earnings-title"><h2 id="earnings-title" className="mb-4 font-serif text-2xl text-ink">Recent transactions</h2>
        {!data.snapshot?.transactions.length ? <p className="rounded-2xl border border-ui p-6 text-sm text-muted">Confirmed earnings, fees and adjustments will appear here. Existing trial purchases do not create real earnings.</p> : <ul className="divide-y divide-ui rounded-2xl border border-ui bg-surface-raised">{data.snapshot.transactions.map(row => <li key={row.id} className="flex flex-wrap justify-between gap-3 p-5"><div className="min-w-0"><p className="capitalize text-ink">{row.kind.replaceAll('_', ' ')}</p><p className="mt-1 text-sm text-muted">{dates(row.occurredAt)} · {row.status === 'pending' ? `Expected settlement ${dates(row.availableAt)}` : row.status}</p></div><div className="text-right"><p className="font-medium text-ink">{formatMoney(row.net, row.currency)}</p><p className="mt-1 text-xs text-muted">Gross {formatMoney(row.amount, row.currency)} · Fee {formatMoney(row.fee, row.currency)}</p></div></li>)}</ul>}
      </section>
      <p className="mt-6 text-xs leading-5 text-muted">Funds are held by Stripe, with no top-ups or transfers between users. The wallet displays recent provider transactions and bank withdrawals; it is not a savings account.</p>
    </>}
  </main>;
}
