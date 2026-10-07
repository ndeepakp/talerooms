import Link from "next/link";
import { TIER_LABELS, currencySymbol } from "@/lib/pricing";
import { BookCover } from "@/components/story/BookCover";
import { htmlToText, wordCount, validateStory } from "@/lib/story-validation";
import { ORIGINALITY_NOTE, type Genre } from "./types";
import type { StoryStudio } from "./useStoryStudio";
import s from "./Studio.module.css";
export function PublishStep({ studio: x, genres, goTo }: { studio: StoryStudio; genres: Genre[]; goTo:(step:number)=>void }) {
  const words = x.chapters.reduce((sum,c) => sum+wordCount(htmlToText(c.body)),0);
  const invalid = validateStory(x.title,x.summary,x.chapters,x.selected,true);
  if(x.matches) return <div className={`${s.panel} ${s.stack}`}>
    <h2 className="text-2xl font-medium">A story with a familiar echo.</h2><p className={s.hint}>The similarity check found related stories. You can credit one as inspiration, publish with the related stories shown, or return to your manuscript.</p>
    {x.matches.map(m => <div key={m.id} className={s.reviewRow}><div><Link href={`/stories/${m.id}`} target="_blank" className="font-medium underline">{m.title}</Link><p className={s.hint}>by {m.author ?? "Unknown"} · {Math.round(m.similarity*100)}% similar</p></div><button type="button" disabled={!!x.loading} onClick={() => void x.publish("inspired",m.id)}>Credit as inspiration</button></div>)}
    <div className={s.chips}><button type="button" className={s.primary} disabled={!!x.loading} onClick={() => void x.publish("discard")}>Publish with related stories</button><button type="button" className={s.button} disabled={!!x.loading} onClick={() => {x.setMatches(null);goTo(1);}}>Keep editing</button></div>
  </div>;
  return <div className={s.review}>
    <div className={`${s.panel} ${s.stack}`}>
      <p className={s.eyebrow}>The final read-through</p><h2>{x.title || "Your untitled story"}</h2><p className={s.hint}>{x.summary || "Add a summary to introduce your story."}</p>
      <div><div className={s.reviewRow}><div><strong>Story details</strong><p className={s.hint}>{genres.filter(g => x.selected.includes(g.id)).map(g => g.name).join(" · ") || "Choose at least one genre"}</p></div><button type="button" onClick={() => goTo(0)}>Edit story</button></div>
      <div className={s.reviewRow}><div><strong>Manuscript</strong><p className={s.hint}>{x.chapters.length} {x.format === "single" ? "short story" : "chapters"} · {words.toLocaleString()} words</p><p className={s.hint}>{x.chapters.filter(c => !htmlToText(c.body)).length > 0 ? "Empty chapters stay in your draft but are omitted when publishing." : !x.chapters.length ? "Your introduction can go live before you add chapters." : ""}</p></div><button type="button" onClick={() => goTo(1)}>Edit manuscript</button></div>
      <div className={s.reviewRow}><div><strong>Reader access</strong><p className={s.hint}>{x.chaptersPublic ? "All chapters public" : x.previewPublic ? x.chapters.length === 1 ? "Entire first chapter public" : "First chapter public · remaining chapters restricted" : "Restricted chapters"}</p>{!x.chaptersPublic && <p className={s.hint}>{x.offeredDurations.map(t => `${TIER_LABELS[t]}${x.offerWhole ? ` bundle: ${currencySymbol(x.currency)}${x.wholePrices[t] ?? 0}` : ""}`).join(" · ") || "No individual access passes"}</p>}</div><button type="button" onClick={() => goTo(2)}>Edit access</button></div></div>
      {invalid && <p className={s.alert}>Before publishing: {invalid}</p>}
      <div><h3 className="text-sm font-semibold">Originality & ownership</h3><p className={`${s.hint} mt-2`}>When you publish, we check for similar stories. A match gives you a chance to add attribution or keep editing. You retain ownership of your work.</p></div>
      <label className={s.check}><input type="checkbox" checked={x.accepted} onChange={e => x.setAccepted(e.target.checked)} /><span>{ORIGINALITY_NOTE}</span></label>
      <button type="button" className={s.primary} disabled={!!x.loading || x.importing || x.coverUploading || !!invalid || !x.accepted} onClick={() => void x.publish()}>{x.loading === "publish" ? "Checking & publishing…" : x.publishedEdit ? "Publish changes" : "Publish story"}</button>
      {x.publishedEdit && <p className={s.hint}>Your existing story stays live until you publish these changes.</p>}
    </div>
    <aside className={`${s.panel} ${s.stack}`} aria-label="Publication preview"><p className={s.eyebrow}>Your place on the shelf</p><BookCover title={x.title || "Your story"} coverUrl={x.coverUrl} coverStyle={x.coverStyle} className={s.cover} /><p className={s.hint}>Your cover and public summary introduce your story. Reader access follows the settings you chose.</p></aside>
  </div>;
}
