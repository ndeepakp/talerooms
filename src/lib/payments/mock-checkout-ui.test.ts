// @vitest-environment jsdom
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
const refresh=vi.hoisted(()=>vi.fn());
vi.mock('next/navigation',()=>({useRouter:()=>({refresh})}));
import { AccessPanel } from '@/components/story/AccessPanel';
import { SubscribeButton } from '@/components/profile/SubscribeButton';
const props={storyId:'00000000-0000-4000-8000-000000000001',offered:['1h','always'] as ('1h'|'always')[],wholePrices:{'1h':100,always:200},currency:'SGD',chapters:[{index:0,title:'First door',prices:{'1h':20,always:40},owned:false},{index:1,title:'Second door',prices:{'1h':30,always:60},owned:false}]};
beforeEach(()=>{refresh.mockClear();vi.spyOn(window,'confirm').mockReturnValue(true);vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('{}',{status:200})));});
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();});
describe('reader mock purchase UI flow',()=>{
  it('canceling confirmation sends no purchase and leaves controls usable',async()=>{
    vi.mocked(window.confirm).mockReturnValue(false);render(createElement(AccessPanel,props));await userEvent.click(screen.getByRole('button',{name:'S$100'}));expect(fetch).not.toHaveBeenCalled();expect(refresh).not.toHaveBeenCalled();expect((screen.getByRole('button',{name:'S$100'}) as HTMLButtonElement).disabled).toBe(false);
  });
  it('confirmed whole purchase submits the selected access and refreshes server state',async()=>{
    render(createElement(AccessPanel,props));await userEvent.click(screen.getByRole('button',{name:'S$100'}));await waitFor(()=>expect(refresh).toHaveBeenCalledOnce());
    expect(window.confirm).toHaveBeenCalledWith('Mock payment: pay S$100 for this access?');expect(fetch).toHaveBeenCalledWith('/api/stories/'+props.storyId+'/purchase',expect.objectContaining({method:'POST',body:JSON.stringify({scope:'whole',duration:'1h'})}));
  });
  it('selects chapters, updates totals and resets stale selections when duration changes',async()=>{
    render(createElement(AccessPanel,props));await userEvent.click(screen.getByRole('checkbox',{name:'First door S$20'}));expect(screen.getByRole('button',{name:'Buy 1 selected · S$20'})).toBeTruthy();
    await userEvent.click(screen.getByRole('button',{name:'Always'}));expect((screen.getByRole('button',{name:'Buy selected · S$0'}) as HTMLButtonElement).disabled).toBe(true);
    await userEvent.click(screen.getByRole('checkbox',{name:'Second door S$60'}));await userEvent.click(screen.getByRole('button',{name:'Buy 1 selected · S$60'}));await waitFor(()=>expect(refresh).toHaveBeenCalledOnce());
    expect(fetch).toHaveBeenCalledWith(expect.any(String),expect.objectContaining({body:JSON.stringify({scope:'chapters',duration:'always',chapterIndexes:[1]})}));
  });
  it('shows a lost-response error, releases busy state and never retries automatically',async()=>{
    vi.mocked(fetch).mockRejectedValue(new Error('offline'));render(createElement(AccessPanel,props));await userEvent.click(screen.getByRole('button',{name:'S$100'}));expect((await screen.findByRole('alert')).textContent).toContain('Refresh');expect(refresh).not.toHaveBeenCalled();expect(fetch).toHaveBeenCalledOnce();expect((screen.getByRole('button',{name:'S$100'}) as HTMLButtonElement).disabled).toBe(false);
  });
  it('disables checkout during an in-flight purchase',async()=>{
    let resolve!:(response:Response)=>void;vi.mocked(fetch).mockReturnValue(new Promise<Response>(r=>{resolve=r;}));render(createElement(AccessPanel,props));const button=screen.getByRole('button',{name:'S$100'});await userEvent.click(button);expect((button as HTMLButtonElement).disabled).toBe(true);await userEvent.click(button);expect(fetch).toHaveBeenCalledOnce();resolve(new Response('{}',{status:200}));await waitFor(()=>expect(refresh).toHaveBeenCalledOnce());
  });
});
describe('mock membership UI flow',()=>{
  it('confirms initial subscribe, cancels retaining access, and resumes without another payment prompt',async()=>{
    render(createElement(SubscribeButton,{authorId:'author-qa',price:25,initialDaysLeft:null,initialCancelled:false}));await userEvent.click(screen.getByRole('button',{name:'Subscribe · ₹25/30d'}));await screen.findByText('Subscribed · 30d left');
    await userEvent.click(screen.getByRole('button',{name:'Unsubscribe'}));await screen.findByText(/Access for 30d/);expect(fetch).toHaveBeenLastCalledWith('/api/users/author-qa/subscribe',{method:'DELETE'});
    const before=vi.mocked(window.confirm).mock.calls.length;await userEvent.click(screen.getByRole('button',{name:'Resume subscription'}));await screen.findByText('Subscribed · 30d left');expect(window.confirm).toHaveBeenCalledTimes(before);expect(fetch).toHaveBeenLastCalledWith('/api/users/author-qa/subscribe',{method:'POST'});
  });
  it('shows failed subscription errors and allows another user action',async()=>{
    vi.mocked(fetch).mockResolvedValue(Response.json({error:'Verify your email'},{status:403}));render(createElement(SubscribeButton,{authorId:'author-qa',price:25,initialDaysLeft:null,initialCancelled:false}));await userEvent.click(screen.getByRole('button',{name:'Subscribe · ₹25/30d'}));expect((await screen.findByRole('alert')).textContent).toBe('Verify your email');expect((screen.getByRole('button',{name:'Subscribe · ₹25/30d'}) as HTMLButtonElement).disabled).toBe(false);expect(refresh).not.toHaveBeenCalled();
  });
});
