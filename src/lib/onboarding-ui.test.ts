// @vitest-environment jsdom
import { createElement } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OnboardingForm } from '@/app/onboarding/OnboardingForm';
const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));
const genres = ['Fantasy', 'Mystery', 'Poetry'].map((name, id) => ({ id, name }));
beforeEach(() => { push.mockClear(); vi.stubGlobal('fetch', vi.fn()); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it('replaces native required popups with associated inline errors and focuses the first missing field', async () => {
  render(createElement(OnboardingForm, { genres, initialName: '' }));
  await userEvent.click(screen.getByRole('button', { name: 'Join the reading room' }));
  expect(document.activeElement).toBe(screen.getByLabelText('Display name'));
  expect(screen.getByLabelText('Display name').getAttribute('aria-invalid')).toBe('true');
  await userEvent.type(screen.getByLabelText('Display name'), 'Jane');
  await userEvent.click(screen.getByRole('button', { name: 'Join the reading room' }));
  expect(document.activeElement).toBe(screen.getByRole('textbox', { name: /Handle/ }));
  expect(screen.getByText('Choose a handle so readers can find you.')).toBeTruthy();
  expect(fetch).not.toHaveBeenCalled();
});
it('blocks short handles and missing genres before submitting a profile', async () => {
  render(createElement(OnboardingForm, { genres, initialName: 'Jane' }));
  await userEvent.type(screen.getByRole('textbox', { name: /Handle/ }), 'ab');
  await userEvent.click(screen.getByRole('button', { name: 'Join the reading room' }));
  expect(screen.getByText('Use 3–20 letters, numbers or underscores.')).toBeTruthy();
  await userEvent.type(screen.getByRole('textbox', { name: /Handle/ }), 'c');
  await userEvent.click(screen.getByRole('button', { name: 'Join the reading room' }));
  expect(screen.getByRole('alert').textContent).toContain('at least 3 genres');
  expect(fetch).not.toHaveBeenCalled();
});
it('keeps the server availability check and saves a valid profile before navigating', async () => {
  vi.mocked(fetch).mockImplementation(async (url) => Response.json(String(url).startsWith('/api/username-check') ? { available: true } : { ok: true }));
  render(createElement(OnboardingForm, { genres, initialName: 'Jane' }));
  await userEvent.type(screen.getByRole('textbox', { name: /Handle/ }), 'JaneWriter');
  for (const genre of genres) await userEvent.click(screen.getByRole('button', { name: genre.name }));
  await userEvent.click(screen.getByRole('button', { name: 'Join the reading room' }));
  expect(fetch).toHaveBeenCalledWith('/api/me/profile', expect.objectContaining({ method: 'PUT', body: JSON.stringify({ name: 'Jane', username: 'JaneWriter', bio: '', genreIds: [0, 1, 2] }) }));
  expect(push).toHaveBeenCalledWith('/feed');
});
