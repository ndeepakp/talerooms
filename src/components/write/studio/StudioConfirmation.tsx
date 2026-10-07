import { useEffect, useId, useRef } from "react";
import type { StoryStudio } from "./useStoryStudio";
import s from "./Studio.module.css";

export function StudioConfirmation({ studio: x }: { studio: StoryStudio }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    if(x.confirmation) dialog.current?.showModal();
    const element = dialog.current;
    return () => element?.close();
  },[x.confirmation]);
  if(!x.confirmation) return null;
  return <dialog ref={dialog} aria-labelledby={titleId} className={s.dialog} onCancel={e => {e.preventDefault();x.setConfirmation(null);}}>
    <h2 id={titleId} className="text-xl font-semibold">{x.confirmation.title}</h2>
    <p className={`${s.hint} my-4`}>{x.confirmation.message}</p>
    <div className={s.chips}><button type="button" className={s.button} autoFocus onClick={() => x.setConfirmation(null)}>Keep editing</button><button type="button" className={s.primary} onClick={() => {x.confirmation?.action();x.setConfirmation(null);}}>{x.confirmation.label}</button></div>
  </dialog>;
}
