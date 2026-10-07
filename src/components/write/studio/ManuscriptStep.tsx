import { useState } from "react";
import { RichTextEditor } from "@/components/write/RichTextEditor";
import { ChapterQuestionsEditor } from "@/components/write/ChapterQuestionsEditor";
import { ChapterPromptsEditor } from "@/components/write/ChapterPromptsEditor";
import { htmlToText, wordCount, MAX_CHAPTER_WORDS, MAX_SHORT_STORY_WORDS } from "@/lib/story-validation";
import { DocumentImport } from "./IdentityStep";
import type { StoryStudio } from "./useStoryStudio";
import s from "./Studio.module.css";

export function ManuscriptStep({ studio: x, focused, setFocused }: { studio: StoryStudio; focused: boolean; setFocused: (on:boolean)=>void }) {
  const [target, setTarget] = useState(1000);
  const chapter = x.chapters.find(c => c.id === x.activeChapterId) ?? x.chapters[0];
  const index = x.chapters.findIndex(c => c.id === chapter?.id);
  const words = chapter ? wordCount(htmlToText(chapter.body)) : 0;
  const total = x.chapters.reduce((sum,c) => sum + wordCount(htmlToText(c.body)),0);
  const limit = x.format === "single" ? MAX_SHORT_STORY_WORDS : MAX_CHAPTER_WORDS;
  return <div className={s.manuscript}>
    <aside className={s.chapterRail} aria-label="Chapter manager">
      <p className={s.eyebrow}>Your manuscript</p>
      <div className={`${s.chips} mt-3`}>
        <button type="button" className={s.chip} aria-pressed={x.format === "chapters"} onClick={() => x.chooseFormat("chapters")}>Chapters</button>
        <button type="button" className={s.chip} aria-pressed={x.format === "single"} onClick={() => x.chooseFormat("single")}>Short story</button>
      </div>
      <p className={`${s.hint} mt-3`}>{total.toLocaleString()} words in total</p>
      <div className={s.chapterList}>{x.chapters.map((c,i) => <div key={c.id} className={`${s.chapterItem} ${c.id === chapter?.id ? s.chapterSelected : ""}`}>
        <button type="button" className={s.chapterSelect} aria-pressed={c.id === chapter?.id} onClick={() => x.setActiveChapterId(c.id)}><small>{x.format === "single" ? "Short story" : `Chapter ${i+1}`}</small>{c.title || "Untitled"}<small>{wordCount(htmlToText(c.body)).toLocaleString()} words</small></button>
        {x.format === "chapters" && <div className={s.chips}>
          <button type="button" className={s.icon} aria-label={`Move chapter ${i+1} up`} disabled={i===0} onClick={() => x.moveChapter(i,-1)}>↑</button>
          <button type="button" className={s.icon} aria-label={`Move chapter ${i+1} down`} disabled={i===x.chapters.length-1} onClick={() => x.moveChapter(i,1)}>↓</button>
          <button type="button" className={s.icon} aria-label={`Remove chapter ${i+1}`} onClick={() => x.removeChapter(c.id)}>Remove</button>
        </div>}
      </div>)}</div>
      {(x.format === "chapters" || !chapter) && <button type="button" className={`${s.button} w-full`} onClick={x.addChapter}>+ Add chapter</button>}
      <div className="mt-5"><DocumentImport studio={x} /></div>
    </aside>
    <section className={`${s.panel} ${s.editorPanel} ${s.stack}`} aria-label="Manuscript editor">
      <div className={s.editorHeader}><p className={s.eyebrow}>{x.format === "single" ? "Short story" : chapter ? `Chapter ${index+1}` : "A blank page. A new world."}</p>
        <div className={s.chips}>{focused && <><p className={s.status} role="status">{x.autoStatus === "saving" ? "Saving…" : x.dirty ? "Unsaved changes" : "Draft saved"}</p><button type="button" className={s.button} disabled={!!x.loading || x.importing} onClick={() => void x.saveDraft()}>Save draft</button></>}<button type="button" className={s.button} aria-pressed={focused} onClick={() => setFocused(!focused)}>{focused ? "Exit focus" : "Focus mode"}</button></div>
      </div>
      {!chapter ? <div className={s.empty}><h2>Your first page is waiting.</h2><p className={s.hint}>Start with a chapter or import your manuscript. You can also publish an introduction and add chapters later.</p><button type="button" className={s.primary} onClick={x.addChapter}>Write your first chapter</button></div> : <>
        {x.format === "chapters" && <label className={s.label}>Chapter title <input className={s.input} value={chapter.title} placeholder="Chapter title (optional)" onChange={e => x.updateChapter(chapter.id,{title:e.target.value})} /></label>}
        <RichTextEditor key={chapter.id} value={chapter.body} onChange={body => x.updateChapter(chapter.id,{body})} placeholder={x.format === "single" ? "Write your short story" : "Write this chapter"} />
        <div className={s.editorHeader}><p className={s.hint}>{words.toLocaleString()} / {limit.toLocaleString()} words{words > limit ? ` — trim ${(words-limit).toLocaleString()} to publish.` : ""}</p>
          <label className={s.goal}>Writing target<input type="number" className={s.input} min={1} max={limit} value={target} onChange={e => setTarget(Math.max(1,Math.min(limit,Number(e.target.value)||1)))} />words</label>
        </div>
        <div className={s.progress} role="progressbar" aria-label="Chapter writing target" aria-valuenow={Math.min(words,target)} aria-valuemin={0} aria-valuemax={target}><span style={{width:`${Math.min(100,words/target*100)}%`}} /></div>
        <details className={s.extras}><summary>Reader extras · quiz & discussion</summary><ChapterQuestionsEditor questions={chapter.questions} onChange={questions => x.updateChapter(chapter.id,{questions})} /><ChapterPromptsEditor prompts={chapter.prompts} onChange={prompts => x.updateChapter(chapter.id,{prompts})} /></details>
      </>}
    </section>
  </div>;
}
