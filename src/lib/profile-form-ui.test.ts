// @vitest-environment jsdom
import { createElement } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProfileForm } from '@/app/[handle]/edit/ProfileForm';
const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));
vi.mock('@/components/profile/AvatarUpload', () => ({ AvatarUpload: () => null }));
const genres = ['Fantasy', 'Mystery', 'Poetry'].map((name, id) => ({id, name}));
const profile = {id:'qa-author',name:'Jane',username:'JaneWriter',bio:'',about:'',subscriptionPrice:null,image:null,genreIds:[0,1,2]};
beforeEach(() => {push.mockClear();vi.stubGlobal('fetch',vi.fn());});
afterEach(() => {cleanup();vi.unstubAllGlobals();});
it.each(['-1','1.5','invalid'])('shows an associated inline price error for %s without saving', async value => {
  render(createElement(ProfileForm,{genres,profile}));
  const input=screen.getByRole('textbox',{name:'Subscription price'});
  expect(input.getAttribute('inputmode')).toBe('numeric');
  await userEvent.type(input,value);
  await userEvent.click(screen.getByRole('button',{name:'Save changes'}));
  expect(screen.getByText('Enter a whole number of 0 or more.')).toBeTruthy();
  expect(input.getAttribute('aria-invalid')).toBe('true');
  expect(document.activeElement).toBe(input);
  expect(fetch).not.toHaveBeenCalled();
});
it('focuses an empty name and preserves entered values after a network failure',async()=>{
  render(createElement(ProfileForm,{genres,profile}));
  const name=screen.getByRole('textbox',{name:'Display name'});
  await userEvent.clear(name);await userEvent.click(screen.getByRole('button',{name:'Save changes'}));
  expect(document.activeElement).toBe(name);
  await userEvent.type(name,'Jane');
  vi.mocked(fetch).mockRejectedValueOnce(new Error('Offline'));
  await userEvent.click(screen.getByRole('button',{name:'Save changes'}));
  expect(screen.getByRole('alert').textContent).toContain('Could not connect');
  expect((screen.getByRole('button',{name:'Save changes'}) as HTMLButtonElement).disabled).toBe(false);
  expect((name as HTMLInputElement).value).toBe('Jane');
});
it.each(['','0','25'])('preserves the subscription save contract for price %s',async value=>{
  vi.mocked(fetch).mockResolvedValueOnce(Response.json({ok:true}));
  render(createElement(ProfileForm,{genres,profile}));
  if(value)await userEvent.type(screen.getByRole('textbox',{name:'Subscription price'}),value);
  await userEvent.click(screen.getByRole('button',{name:'Save changes'}));
  expect(fetch).toHaveBeenCalledWith('/api/me/profile',expect.objectContaining({body:JSON.stringify({name:'Jane',username:'JaneWriter',bio:'',about:'',subscriptionPrice:Number(value),genreIds:[0,1,2]})}));
  expect(push).toHaveBeenCalledWith('/JaneWriter');
});
