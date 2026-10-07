import { CURRENCIES, TIERS, TIER_LABELS, currencySymbol, type Tier } from "@/lib/pricing";
import type { StoryStudio } from "./useStoryStudio";
import s from "./Studio.module.css";
const price = (value:string) => Math.max(0,Math.floor(Number(value)||0));
export function AccessStep({ studio: x }: { studio: StoryStudio }) {
  function preset(kind:"public"|"preview"|"private") {
    x.setChaptersPublic(kind === "public"); x.setPreviewPublic(kind === "preview");
    if(kind !== "public" && !x.offeredDurations.length) x.setOfferedDurations(["always"]);
  }
  const active = x.chaptersPublic ? "public" : x.previewPublic ? "preview" : "private";
  function priceField(t:Tier,value:number|undefined,label:string,change:(n:number)=>void) {
    return <label className={s.label} key={t}><span>{TIER_LABELS[t]}</span><span className={s.hint}>{currencySymbol(x.currency)}</span><input type="number" aria-label={label} className={s.input} min={0} step={1} value={value ?? ""} placeholder="0" onChange={e => change(price(e.target.value))} /></label>;
  }
  return <div className={s.stack}>
    <div className={s.options}>{([
      ["public","Free for everyone","Let anyone read every chapter, including visitors who haven’t signed in."],
      ["preview","An open first chapter","Give everyone a taste. Keep the remaining chapters behind your access settings."],
      ["private","Members & passes","Keep chapters behind access. Offer durations and optional story bundles."],
    ] as const).map(([kind,title,hint]) => <button key={kind} type="button" className={s.option} aria-pressed={active===kind} onClick={() => preset(kind)}><strong>{title}</strong><span className={s.hint}>{hint}</span></button>)}</div>
    {x.format === "single" && x.previewPublic && !x.chaptersPublic && <p className={s.hint}>A short story is one chapter. A free first-chapter preview makes its entire text public.</p>}
    {x.chaptersPublic ? <div className={s.panel}><h2 className="text-lg font-medium">An open door to your story.</h2><p className={`${s.hint} mt-2`}>Your summary and all published chapters will be public. Readers can get to know your work without an access pass.</p></div> : <>
      <div className={`${s.panel} ${s.stack}`}>
        <div className={s.editorHeader}><h2 className="text-lg font-medium">Access options</h2><label className={s.label}>Currency<select className={s.input} value={x.currency} onChange={e => x.setCurrency(e.target.value)}>{CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}</select></label></div>
        <fieldset><legend className="mb-3 text-sm font-medium">Choose the durations you offer</legend><div className={s.chips}>{TIERS.map(t => <button key={t} type="button" className={s.chip} aria-pressed={x.offeredDurations.includes(t)} onClick={() => x.toggleTier(t)}>{TIER_LABELS[t]}</button>)}</div><p className={`${s.hint} mt-3`}>Always means no expiry. Enter whole currency units; 0 means free. Live payments and author payouts are coming later.</p></fieldset>
        {!!x.offeredDurations.length && <><label className={s.check}><input type="checkbox" checked={x.offerWhole} onChange={e => x.setOfferWhole(e.target.checked)} /><span>Offer the whole story as a bundle</span></label>{x.offerWhole && <div className={s.priceGrid}>{x.offeredDurations.map(t => priceField(t,x.wholePrices[t],`Whole story ${TIER_LABELS[t]} price`,n => x.setWholePrices(prev => ({...prev,[t]:n}))))}</div>}</>}
        {!x.offeredDurations.length && <p className={s.hint}>No individual access passes are offered. Existing author memberships can still provide access.</p>}
      </div>
      {!!x.offeredDurations.length && <div className={`${s.panel} ${s.stack}`}><h2 className="text-lg font-medium">Individual chapter prices</h2><p className={s.hint}>Set each chapter’s options here, so the manuscript stays focused on your writing.</p>
        {!x.chapters.length && <p className={s.hint}>Add chapters in Manuscript to set their prices.</p>}
        {x.chapters.map((c,i) => <div key={c.id} className={s.stack}><div className={s.editorHeader}><h3 className="text-sm font-medium">{c.title || (x.format === "single" ? "Short story" : `Chapter ${i+1}`)}</h3>{i>0 && <button type="button" className={s.button} onClick={() => x.updateChapter(c.id,{prices:{...x.chapters[i-1].prices}})}>Copy previous prices</button>}</div><div className={s.priceGrid}>{x.offeredDurations.map(t => priceField(t,c.prices[t],`Chapter ${i+1} ${TIER_LABELS[t]} price`,n => x.setChapterPrice(c.id,t,n)))}</div></div>)}
      </div>}
    </>}
  </div>;
}
