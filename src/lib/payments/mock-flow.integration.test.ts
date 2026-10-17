import { beforeEach, afterEach, afterAll, describe, expect, it, vi } from 'vitest';
import postgres from 'postgres';
import { randomUUID } from 'node:crypto';
const state=vi.hoisted(()=>({ tx: null as unknown as import('postgres').TransactionSql, userId: '' }));
vi.mock('@/lib/db',()=> {
  const proxy=Object.assign((...args: unknown[])=>Reflect.apply(state.tx,undefined,args),{ begin: (callback: (tx: import('postgres').TransactionSql)=>Promise<unknown>)=>state.tx.savepoint(callback) });
  return {sql:proxy};
});
vi.mock('@/lib/http',async original=>({ ...await original<typeof import('@/lib/http')>(), requireSession:async()=>({user:{id:state.userId}}) }));
vi.mock('@/lib/notify',()=>({notify:vi.fn()}));
import { POST as purchase, DELETE as revoke } from '@/app/api/stories/[id]/purchase/route';
import { POST as subscribe, DELETE as cancel } from '@/app/api/users/[id]/subscribe/route';
const enabled=process.env.PAYMENTS_DB_TESTS==='true';
beforeEach(() => vi.stubEnv('STRIPE_CHECKOUT_ENABLED', 'false'));
afterEach(() => vi.unstubAllEnvs());
if(enabled && !['localhost','127.0.0.1','[::1]'].includes(new URL(process.env.DATABASE_URL!).hostname))throw new Error('Payment DB tests require a local database.');
const db=postgres(process.env.DATABASE_URL!,{max:2});
afterAll(async()=>{await db.end();});
const rollback=new Error('rollback successful fixture');
async function fixture(test:(tx:postgres.TransactionSql,ids:{author:string;reader:string;story:string})=>Promise<void>){
  try { await db.begin(async tx=>{
    state.tx=tx; const author=randomUUID(); const reader=randomUUID(); const story=randomUUID(); state.userId=reader;
    for(const id of [author,reader])await tx`INSERT INTO "user"(id,name,email,"emailVerified","createdAt","updatedAt",subscription_price) VALUES (${id},'Mock payment QA',${id+'@example.test'},true,now(),now(),25)`;
    await tx`INSERT INTO stories(id,author_id,title,body,excerpt,summary,status,chapters_public,offered_durations,whole_prices,chapters,currency)
      VALUES (${story},${author},'Mock payment QA','QA body','QA excerpt','QA summary','published',false,${['1h','always']},${tx.json({'1h':100,always:200})},${tx.json([{title:'First',body:'<p>First private chapter</p>',prices:{'1h':20,always:40}},{title:'Second',body:'<p>Second private chapter</p>',prices:{'1h':30,always:60}}])},'SGD')`;
    await test(tx,{author,reader,story}); throw rollback;
  }); }catch(error){if(error!==rollback)throw error;}
}
function req(body:unknown){return new Request('http://localhost:3000/api/test',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});}
function params(id:string){return {params:Promise.resolve({id})};}
describe.skipIf(!enabled)('mock payment flow through actual handlers and PostgreSQL',()=>{
  it('blocks mock subscriptions in Stripe mode without granting or renewing access',async()=>fixture(async(tx,{author,reader})=>{
    vi.stubEnv('STRIPE_CHECKOUT_ENABLED','true');
    expect((await subscribe(req({}),params(author))).status).toBe(409);
    expect(await tx`SELECT * FROM subscriptions WHERE author_id=${author} AND subscriber_id=${reader}`).toHaveLength(0);
    await tx`INSERT INTO subscriptions(subscriber_id,author_id,amount,expires_at,cancelled) VALUES(${reader},${author},25,now()+interval '2 days',true)`;
    const [before]=await tx`SELECT * FROM subscriptions WHERE author_id=${author} AND subscriber_id=${reader}`;
    expect((await subscribe(req({}),params(author))).status).toBe(409);
    const [after]=await tx`SELECT * FROM subscriptions WHERE author_id=${author} AND subscriber_id=${reader}`;
    expect(after.expires_at).toEqual(before.expires_at);expect(after.cancelled).toBe(true);
  }));
  it('whole-story payment uses server prices, grants access and supports discounted expired renewal',async()=>fixture(async(tx,{story,reader})=>{
    const response=await purchase(req({scope:'whole',duration:'1h',amount:1,currency:'USD'}),params(story));expect(response.status).toBe(200);expect(await response.json()).toEqual({ok:true,total:100});
    const [grant]=await tx`SELECT * FROM access_grants WHERE story_id=${story} AND user_id=${reader}`;expect(grant.scope).toBe('whole');expect(grant.amount).toBe(100);expect(grant.expires_at.getTime()-Date.now()).toBeGreaterThan(3500000);
    await tx`UPDATE access_grants SET expires_at=now()-interval '1 second' WHERE story_id=${story}`;
    const renewal=await purchase(req({scope:'whole',duration:'always'}),params(story));expect(await renewal.json()).toEqual({ok:true,total:150});
    const active=await tx`SELECT * FROM access_grants WHERE story_id=${story} AND (expires_at IS NULL OR expires_at>now())`;expect(active).toHaveLength(1);expect(active[0].expires_at).toBeNull();
  }));
  it('chapter payment deduplicates selections, unlocks only purchased chapters and never funds the wallet',async()=>fixture(async(tx,{story,reader})=>{
    const [before]=await tx`SELECT count(*)::int AS n FROM wallet_transactions`;
    const response=await purchase(req({scope:'chapters',duration:'always',chapterIndexes:[1,1],total:0}),params(story));expect(await response.json()).toEqual({ok:true,total:60});
    const grants=await tx`SELECT * FROM access_grants WHERE story_id=${story} AND user_id=${reader}`;expect(grants).toHaveLength(1);expect(grants[0].scope).toBe('chapter');expect(grants[0].chapter_index).toBe(1);expect(grants[0].expires_at).toBeNull();
    const [after]=await tx`SELECT count(*)::int AS n FROM wallet_transactions`;expect(after.n).toBe(before.n);
  }));
  it('invalid requests cannot grant access, and only the author can revoke a test grant',async()=>fixture(async(tx,{story,reader,author})=>{
    for(const body of [null,[],{}, {scope:'chapters',duration:'1h',chapterIndexes:[0,'1']},{scope:'chapters',duration:'1h',chapterIndexes:[-1]}, {scope:'whole',duration:'1d'}])expect((await purchase(req(body),params(story))).status).toBe(400);
    state.userId=author;expect((await purchase(req({scope:'whole',duration:'1h'}),params(story))).status).toBe(400);state.userId=reader;
    await tx`UPDATE stories SET status='draft' WHERE id=${story}`;expect((await purchase(req({scope:'whole',duration:'1h'}),params(story))).status).toBe(404);
    await tx`UPDATE stories SET status='published',chapters_public=true WHERE id=${story}`;expect((await purchase(req({scope:'whole',duration:'1h'}),params(story))).status).toBe(400);
    await tx`UPDATE stories SET chapters_public=false,whole_prices=${tx.json({'1h':3000000000,always:200})} WHERE id=${story}`;expect((await purchase(req({scope:'whole',duration:'1h'}),params(story))).status).toBe(400);
    expect(await tx`SELECT * FROM access_grants WHERE story_id=${story}`).toHaveLength(0);
    await purchase(req({scope:'whole',duration:'always'}),params(story));expect((await revoke(req({userId:reader}),params(story))).status).toBe(403);
    state.userId=author;expect((await revoke(req(null),params(story))).status).toBe(400);expect((await revoke(req({userId:reader}),params(story))).status).toBe(200);
    expect(await tx`SELECT * FROM access_grants WHERE story_id=${story}`).toHaveLength(0);
  }));
  it('subscription grants 30-day access, repeat/cancel/resume preserve the same period, expired renewal resets access',async()=>fixture(async(tx,{author,reader})=>{
    const [before]=await tx`SELECT count(*)::int AS n FROM wallet_transactions`;
    expect((await subscribe(req({amount:1}),params(author))).status).toBe(200);
    const [first]=await tx`SELECT * FROM subscriptions WHERE author_id=${author} AND subscriber_id=${reader}`;expect(first.amount).toBe(25);expect(first.expires_at.getTime()-Date.now()).toBeGreaterThan(29*86400000);
    expect(await (await subscribe(req({}),params(author))).json()).toEqual({subscribed:true,alreadyActive:true});
    await cancel(req({}),params(author));const [cancelled]=await tx`SELECT * FROM subscriptions WHERE author_id=${author} AND subscriber_id=${reader}`;expect(cancelled.cancelled).toBe(true);expect(cancelled.expires_at).toEqual(first.expires_at);
    await subscribe(req({}),params(author));const [resumed]=await tx`SELECT * FROM subscriptions WHERE author_id=${author} AND subscriber_id=${reader}`;expect(resumed.cancelled).toBe(false);expect(resumed.expires_at).toEqual(first.expires_at);
    await tx`UPDATE subscriptions SET expires_at=now()-interval '1 day' WHERE author_id=${author} AND subscriber_id=${reader}`;
    await subscribe(req({}),params(author));const [renewed]=await tx`SELECT * FROM subscriptions WHERE author_id=${author} AND subscriber_id=${reader}`;expect(renewed.expires_at.getTime()-Date.now()).toBeGreaterThan(29*86400000);
    state.userId=author;expect((await subscribe(req({}),params(author))).status).toBe(400);
    const [after]=await tx`SELECT count(*)::int AS n FROM wallet_transactions`;expect(after.n).toBe(before.n);
  }));
});
