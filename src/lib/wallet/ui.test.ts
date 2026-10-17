// @vitest-environment jsdom
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Wallet, type WalletData } from '@/app/wallet/Wallet';
const data = (ready = false): WalletData => ({ configured: true, mode: 'test', countries: ['SG'], account: { country: 'SG' }, canWithdraw: ready,
  snapshot: { chargesEnabled: ready, payoutsEnabled: ready, schedule: 'daily', banks: [{ currency: 'sgd', label: 'Test bank ···· 1234' }], available: [{ currency: 'sgd', amount: 10000, sources: { card: 10000 } }], pending: [{ currency: 'sgd', amount: 2000 }], transactions: [] }, withdrawals: [] });
beforeEach(() => vi.stubGlobal('fetch', vi.fn()));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
describe('wallet UI recovery and withdrawal boundaries', () => {
  it('recovers from a failed initial load without leaving the wallet stuck', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Connection lost')).mockResolvedValueOnce(Response.json(data()));
    render(createElement(Wallet)); expect(await screen.findByRole('alert')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await screen.findByRole('heading', { name: 'Finish your payout setup' }); expect(screen.queryByRole('alert')).toBeNull();
  });
  it.each([false, true])('shows readiness %s without enabling withdrawals when controls are disabled', ready => {
    render(createElement(Wallet, { initialData: { ...data(ready), canWithdraw: false } }));
    expect(screen.getByText('Test mode.')).toBeTruthy(); expect(screen.queryByRole('button', { name: 'Review withdrawal' })).toBeNull();
    expect(screen.getByRole('heading', { name: ready ? 'Your payout account' : 'Finish your payout setup' })).toBeTruthy();
  });
  it('releases controls after an onboarding error and never redirects on rejection', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ error: 'Sign in again' }, { status: 403 }));
    render(createElement(Wallet, { initialData: data() })); await userEvent.click(screen.getByRole('button', { name: 'Manage payout setup' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Sign in again');
    expect((screen.getByRole('button', { name: 'Manage payout setup' }) as HTMLButtonElement).disabled).toBe(false);
    expect(fetch).toHaveBeenCalledExactlyOnceWith('/api/wallet/onboarding', expect.objectContaining({ body: JSON.stringify({ country: 'SG' }), method: 'POST' }));
  });
  it('disables actions during refresh and recovers after a lost response', async () => {
    let reject!: (e: Error) => void; vi.mocked(fetch).mockReturnValue(new Promise((_, fail) => { reject = fail; }));
    render(createElement(Wallet, { initialData: data() })); await userEvent.click(screen.getByRole('button', { name: 'Refresh wallet' }));
    expect((screen.getByRole('button', { name: 'Manage payout setup' }) as HTMLButtonElement).disabled).toBe(true);
    await userEvent.click(screen.getByRole('button', { name: 'Refresh wallet' })); expect(fetch).toHaveBeenCalledTimes(1);
    reject(new Error('Connection lost')); await screen.findByRole('alert');
    expect((screen.getByRole('button', { name: 'Refresh wallet' }) as HTMLButtonElement).disabled).toBe(false);
  });
  it('review and cancel never request a withdrawal', async () => {
    render(createElement(Wallet, { initialData: data(true) })); await userEvent.type(screen.getByRole('textbox', { name: 'Amount (SGD)' }), '10');
    await userEvent.click(screen.getByRole('button', { name: 'Review withdrawal' })); expect(screen.getByText(/Send 10 SGD/)).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' })); expect(fetch).not.toHaveBeenCalled();
  });
  it('retries an ambiguous withdrawal using the same immutable request, never another payout key', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Connection lost')).mockResolvedValueOnce(Response.json({ withdrawal: { status: 'pending' } })).mockResolvedValueOnce(Response.json(data(true)));
    render(createElement(Wallet, { initialData: data(true) })); await userEvent.type(screen.getByRole('textbox', { name: 'Amount (SGD)' }), '10');
    await userEvent.click(screen.getByRole('button', { name: 'Review withdrawal' })); await userEvent.click(screen.getByRole('button', { name: 'Confirm withdrawal' }));
    await screen.findByRole('alert'); expect((screen.getByRole('textbox', { name: 'Amount (SGD)' }) as HTMLInputElement).disabled).toBe(true);
    await userEvent.click(screen.getByRole('button', { name: 'Check the same withdrawal' })); await screen.findByRole('status');
    const requests = vi.mocked(fetch).mock.calls.filter(([path]) => path === '/api/wallet/withdrawals');
    expect(requests).toHaveLength(2); expect(requests[0][1]?.body).toBe(requests[1][1]?.body);
    expect(JSON.parse(String(requests[0][1]?.body))).toMatchObject({ amount: '10', currency: 'sgd', source: 'card' });
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Check the same withdrawal' })).toBeNull());
  });
});
