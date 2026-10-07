import { BookCover } from "@/components/story/BookCover";
import { COVER_PALETTES } from "@/lib/cover-style";
import { MAX_TITLE_WORDS, MAX_SUMMARY_WORDS, wordCount } from "@/lib/story-validation";
import type { StoryStudio } from "./useStoryStudio";
import type { Genre } from "./types";
import s from "./Studio.module.css";

export function DocumentImport({ studio }: { studio: StoryStudio }) {
  return <div className={s.import}>
    <p className="text-sm font-semibold">Already have a manuscript?</p>
    <p className={s.hint}>Bring a Word document. We’ll keep its formatting and turn headings into chapters. Review everything before publishing.</p>
    <details><summary>How to format your document</summary><ul className={s.hint}>
      <li>The filename becomes the title if you haven’t entered one.</li>
      <li>Text before the first Heading 1 becomes the summary.</li>
      <li>Use Heading 1 for chapter titles; no headings imports as a short story.</li>
      <li>For quizzes, use Heading 2 “Quiz”, then a question and bulleted options; bold the correct answer.</li>
      <li>Use Heading 2 “Discuss” for open questions, one per line.</li>
    </ul></details>
    <div className={s.chips}>
      <label className={`${s.button} ${s.upload}`}>{studio.importing ? "Importing…" : studio.chapters.length ? "Import more chapters" : "Import .docx"}
        <input aria-label="Import Word document" type="file" accept=".docx" disabled={studio.importing || !!studio.loading} onChange={e => { const file = e.target.files?.[0]; e.target.value = ""; if(file) void studio.importDoc(file); }} />
      </label>
      <a href="/talerooms-example-story.docx" download className={s.button}>Example document</a>
    </div>
    {studio.importError && <p role="alert" className={s.alert}>{studio.importError}</p>}
  </div>;
}
export function IdentityStep({ studio: x, genres }: { studio: StoryStudio; genres: Genre[] }) {
  return <div className={s.identity}>
    <div className={`${s.panel} ${s.stack}`}>
      <label className={s.label}><span className={s.labelRow}>Story title <span className={s.hint}>{wordCount(x.title)}/{MAX_TITLE_WORDS} words</span></span>
        <input className={s.input} value={x.title} onChange={e => x.setTitle(e.target.value)} placeholder="The title of your story" aria-invalid={wordCount(x.title) > MAX_TITLE_WORDS} />
      </label>
      <label className={s.label}><span className={s.labelRow}>Summary <span className={s.hint}>{wordCount(x.summary)}/{MAX_SUMMARY_WORDS} words</span></span>
        <textarea className={s.input} rows={5} value={x.summary} onChange={e => x.setSummary(e.target.value)} placeholder="A hook that makes someone turn the page…" aria-invalid={wordCount(x.summary) > MAX_SUMMARY_WORDS} />
        <span className={s.hint}>Your public introduction. Give readers a glimpse without giving everything away.</span>
      </label>
      <fieldset className={s.stack}><legend className="mb-3 text-sm font-medium">Genres <span className={s.hint}>· Choose at least one to publish</span></legend>
        <div className={s.chips}>{genres.map(g => <button key={g.id} type="button" className={s.chip} aria-pressed={x.selected.includes(g.id)} onClick={() => x.setSelected(prev => prev.includes(g.id) ? prev.filter(id => id !== g.id) : [...prev,g.id])}>{g.name}</button>)}</div>
      </fieldset>
      <DocumentImport studio={x} />
    </div>
    <aside className={`${s.panel} ${s.stack}`} aria-label="Cover designer">
      <div><p className={s.eyebrow}>The first impression</p><h2 className="mt-2 text-xl font-medium">Make it yours.</h2></div>
      <BookCover title={x.title || "Your story"} coverUrl={x.coverUrl} coverStyle={x.coverStyle} className={s.cover} />
      <div className={s.chips}>
        <label className={`${s.button} ${s.upload}`}>{x.coverUploading ? "Uploading…" : x.coverUrl ? "Replace cover" : "Upload cover"}<input aria-label="Upload cover image" type="file" accept="image/*" disabled={x.coverUploading || !!x.loading} onChange={x.onCoverChange} /></label>
        {x.coverUrl && <button type="button" className={s.button} onClick={() => x.setCoverUrl(null)}>Remove image</button>}
      </div>
      {!x.coverUrl && <><p className={s.hint}>Or choose a jacket colour</p><div className={s.chips}>{COVER_PALETTES.map((p,i) => <button key={i} type="button" className={s.palette} style={{background:p.bg}} aria-label={`Cover style ${i+1}`} aria-pressed={x.coverStyle?.palette === i} onClick={() => x.setCoverStyle({palette:i})} />)}</div><button type="button" className={s.chip} aria-pressed={x.coverStyle === null} onClick={() => x.setCoverStyle(null)}>No generated cover</button></>}
      <p className={s.hint}>The preview updates as you write your title. You can change it any time.</p>
    </aside>
  </div>;
}
