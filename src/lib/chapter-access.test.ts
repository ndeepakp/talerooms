import { describe, expect, it } from 'vitest';
import { chapterAccessAction } from './chapter-access';
const base = {storyHref:'/stories/test',index:1,offered:['1h','always'] as ('1h'|'always')[],currency:'SGD',prices:{'1h':20},wholePrices:{'1h':100}};
describe('contextual chapter access',()=>{
  it('links to the exact locked chapter and purchase section with price and duration',()=>{
    expect(chapterAccessAction(base)).toEqual({href:'/stories/test?chapter=1&buy=1#chapter-access',label:'Unlock this chapter',detail:'S$20 · 1 hour access · Demo, no charge'});
  });
  it('shows renewal pricing and permanent access',()=>{
    expect(chapterAccessAction({...base,prices:{always:40},discount:25})?.detail).toBe('S$30 · Permanent access · Demo, no charge');
  });
  it('explains when access requires a whole-story bundle',()=>{
    expect(chapterAccessAction({...base,prices:{}})).toMatchObject({label:'Unlock with whole story',detail:'S$100 · 1 hour access · All chapters · Demo, no charge'});
  });
  it('handles free access and never offers an unavailable price',()=>{
    expect(chapterAccessAction({...base,prices:{'1h':0}})?.detail).toContain('Free');
    expect(chapterAccessAction({...base,prices:{},wholePrices:{}})).toBeUndefined();
  });
});
