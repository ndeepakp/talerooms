// @vitest-environment jsdom
import { createElement } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ValidatedForm } from '@/components/auth/ValidatedForm';
afterEach(cleanup);
it('shows inline required feedback, associates it with the field and focuses it without calling the submit handler',async()=>{
  const submit=vi.fn(event=>event.preventDefault());
  render(createElement(ValidatedForm,{onSubmit:submit},createElement('label',null,'Email',createElement('input',{type:'email',required:true})),createElement('button',null,'Continue')));
  await userEvent.click(screen.getByRole('button',{name:'Continue'}));
  const input=screen.getByRole('textbox',{name:/Email/});
  expect(input.closest('form')?.getAttribute('method')).toBe('post');
  expect(submit).not.toHaveBeenCalled();expect(document.activeElement).toBe(input);
  expect(screen.getByRole('alert').textContent).toBe('Email is required.');
  expect(input.getAttribute('aria-describedby')).toBe(screen.getByRole('alert').id);
  await userEvent.type(input,'invalid');expect(screen.queryByRole('alert')).toBeNull();
  expect(input.hasAttribute('aria-invalid')).toBe(false);
  await userEvent.click(screen.getByRole('button',{name:'Continue'}));
  expect(screen.getByRole('alert').textContent).toBe('Enter a valid email address.');
  await userEvent.clear(input);await userEvent.type(input,'reader@example.test');await userEvent.click(screen.getByRole('button',{name:'Continue'}));
  expect(submit).toHaveBeenCalledTimes(1);expect(screen.queryByRole('alert')).toBeNull();
});
it('keeps existing help associations when correcting a code and displays an inline pattern error',async()=>{
  render(createElement(ValidatedForm,{onSubmit:event=>event.preventDefault()},createElement('input',{'aria-label':'Verification code','aria-describedby':'code-help',autoComplete:'one-time-code',pattern:'[0-9]{6}',required:true}),createElement('p',{id:'code-help'},'Check your inbox'),createElement('button',null,'Verify')));
  const input=screen.getByRole('textbox',{name:'Verification code'});await userEvent.type(input,'123');await userEvent.click(screen.getByRole('button',{name:'Verify'}));
  expect(screen.getByRole('alert').textContent).toBe('Enter the six-digit code from your email.');
  expect(input.getAttribute('aria-describedby')).toContain('code-help');
  await userEvent.type(input,'456');expect(input.getAttribute('aria-describedby')).toBe('code-help');
});
