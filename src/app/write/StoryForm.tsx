"use client";

import { useEffect, useRef, useState } from "react";
import { StudioConfirmation } from "@/components/write/studio/StudioConfirmation";
import { IdentityStep } from "@/components/write/studio/IdentityStep";
import { ManuscriptStep } from "@/components/write/studio/ManuscriptStep";
import { AccessStep } from "@/components/write/studio/AccessStep";
import { PublishStep } from "@/components/write/studio/PublishStep";
import { useStoryStudio } from "@/components/write/studio/useStoryStudio";
import { STUDIO_STEPS, type Genre, type EditStory } from "@/components/write/studio/types";
import s from "@/components/write/studio/Studio.module.css";

export function StoryForm({ genres, story }: { genres: Genre[]; story?: EditStory }) {
  const x = useStoryStudio(story);
  const [step, setStep] = useState(0);
  const [focused, setFocused] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const stepChanged = useRef(false);
  function goTo(next:number) { if(next !== 3 && x.matches) x.setMatches(null); stepChanged.current = true; setStep(next); x.setError(null); }
  useEffect(() => { if(stepChanged.current) heading.current?.focus(); },[step]);
  useEffect(() => { if(focused) window.scrollTo(0,0); },[focused]);
  useEffect(() => {
    function escape(e:KeyboardEvent) { if(e.key === "Escape") setFocused(false); }
    window.addEventListener("keydown",escape);
    return () => window.removeEventListener("keydown",escape);
  },[]);
  const busy = !!x.loading || x.importing || x.coverUploading;
  const status = x.autoStatus === "saving" || x.loading === "draft" ? "Saving draft…" : x.autoStatus === "error" ? "Draft not saved · retry saving" : x.dirty ? x.title.trim() ? "Unsaved changes" : "Add a title to save your draft" : x.savedAt ? `Saved at ${x.savedAt.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}` : story ? story.status === "published" ? "Published story · edits save privately" : "Saved draft ready to edit" : "Your next story starts here";
  return <main className={`${s.studio} ${focused && step===1 ? s.focus : ""}`}>
    <StudioConfirmation studio={x} />
    <div className={s.shell}>
      <header className={s.top}><div><p className={s.brand}>Author studio</p><p className={`${s.eyebrow} mt-1`}>Your writing room</p></div>
        <div className={s.actions}><p className={s.status} role="status" aria-live="polite">{status}</p><button type="button" className={s.button} disabled={busy} onClick={() => void x.saveDraft()}>{x.loading === "draft" ? "Saving…" : x.autoStatus === "error" ? "Retry save" : "Save draft"}</button><button type="button" className={s.button} disabled={busy} onClick={() => x.leave("/feed")}>Exit studio</button></div>
      </header>
      <nav className={s.steps} aria-label="Story creation steps">{STUDIO_STEPS.map((item,i) => <button type="button" key={item.label} className={`${s.step} ${step===i ? s.current : ""}`} aria-current={step===i ? "step" : undefined} disabled={!!x.loading} onClick={() => goTo(i)}><span aria-hidden="true">{String(i+1).padStart(2,"0")}</span><span>{item.label}</span></button>)}</nav>
      <div className={s.heading}><p className={s.eyebrow}>Step {step+1} of 4 · {story ? "Your story, evolving" : "A new story"}</p><h1 ref={heading} tabIndex={-1}>{STUDIO_STEPS[step].title}</h1><p>{STUDIO_STEPS[step].description}</p></div>
      {x.publishedEdit && step===0 && <p className={s.hint}>You’re editing a working copy. Your published story stays live until you publish changes.</p>}
      {x.error && <p role="alert" className={s.alert}>{x.error}</p>}
      {x.autoStatus === "error" && !x.error && <p role="alert" className={s.alert}>We couldn’t save your latest changes. They’re still in this editor. Retry Save draft before leaving.</p>}
      <fieldset disabled={!!x.loading}>
        {step===0 && <IdentityStep studio={x} genres={genres} />}
        {step===1 && <ManuscriptStep studio={x} focused={focused} setFocused={setFocused} />}
        {step===2 && <AccessStep studio={x} />}
        {step===3 && <PublishStep studio={x} genres={genres} goTo={goTo} />}
      </fieldset>
      <footer className={s.footer}><p>Drafts are private. Autosave starts after you add a title.<br />Saved drafts expire after 7 days without an update.</p><div className={s.actions}>{step>0 && <button type="button" className={s.button} disabled={!!x.loading} onClick={() => goTo(step-1)}>Back</button>}{step<3 && <button type="button" className={s.primary} disabled={!!x.loading} onClick={() => goTo(step+1)}>Continue to {STUDIO_STEPS[step+1].label}</button>}</div></footer>
    </div>
  </main>;
}
