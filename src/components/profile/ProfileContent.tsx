"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import s from "./Profile.module.css";

export function ProfileContent({ works, posts }: { works: ReactNode; posts: ReactNode }) {
  const [active, setActive] = useState(0);
  const id = useId();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => {
    let frame = 0;
    const showSection = (hash: string) => {
      if (hash !== "#works" && hash !== "#thoughts") return;
      setActive(hash === "#thoughts" ? 1 : 0);
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => document.getElementById(hash.slice(1))?.scrollIntoView({ block: "start" }));
    };
    const showHash = () => showSection(window.location.hash);
    const jumpToSection = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const anchor = event.target.closest('a[href="#works"], a[href="#thoughts"]');
      if (anchor) showSection(anchor.getAttribute("href")!);
    };
    frame = requestAnimationFrame(showHash);
    window.addEventListener("hashchange", showHash);
    document.addEventListener("click", jumpToSection);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", showHash);
      document.removeEventListener("click", jumpToSection);
    };
  }, []);
  return <div className={s.content}>
    <div className={s.tabs} role="tablist" aria-label="Author portfolio">
      {["Stories", "Thoughts"].map((label, i) => <button key={label} ref={el => { buttons.current[i] = el; }} type="button" id={`${id}-tab-${i}`} role="tab" aria-selected={active === i} aria-controls={`${id}-panel-${i}`} tabIndex={active === i ? 0 : -1} onClick={() => setActive(i)} onKeyDown={event => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        const next = event.key === "Home" ? 0 : event.key === "End" ? 1 : 1 - i;
        setActive(next); buttons.current[next]?.focus();
      }}>{label}</button>)}
    </div>
    <div id={`${id}-panel-0`} role="tabpanel" aria-labelledby={`${id}-tab-0`} hidden={active !== 0}>{works}</div>
    <div id={`${id}-panel-1`} role="tabpanel" aria-labelledby={`${id}-tab-1`} hidden={active !== 1} className={s.posts}><h2 id="thoughts" className={s.works}>Thoughts from this voice.</h2>{posts}</div>
  </div>;
}
