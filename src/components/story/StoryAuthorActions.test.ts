// @vitest-environment jsdom
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StoryAuthorActions } from './StoryAuthorActions';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
describe('story management disclosure', () => {
  it('keeps deletion out of the toolbar and closes with Escape, restoring focus', async () => {
    const request = vi.fn(); vi.stubGlobal('fetch', request);
    render(createElement(StoryAuthorActions, { storyId: 'my-story' }));
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();
    const trigger = screen.getByRole('button', { name: 'Manage story' });
    await userEvent.click(trigger);
    expect(screen.getByRole('link', { name: 'Edit story' }).getAttribute('href')).toBe('/stories/my-story/edit');
    expect(screen.getByRole('button', { name: 'Delete' })).toBeTruthy();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('region', { name: 'Story management' })).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(request).not.toHaveBeenCalled();
  });
  it('dismisses on an outside pointer action without deleting anything', async () => {
    render(createElement(StoryAuthorActions, { storyId: 'my-story' }));
    await userEvent.click(screen.getByRole('button', { name: 'Manage story' }));
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('region', { name: 'Story management' })).toBeNull();
  });
});
