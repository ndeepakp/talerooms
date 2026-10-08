"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import s from "./Profile.module.css";

export function ProfileContent({ works, posts }: { works: ReactNode; posts: ReactNode }) {
  const [active, setActive] = useState(0);
  const id = useId();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => {
    const showWorks = () => { if (window.location.hash === "#works") setActive(0); };
    let frame = 0;
    const jumpToWorks = (event: MouseEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest('a[href="#works"]')) return;
      setActive(0);
      frame = requestAnimationFrame(() => document.getElementById("works")?.scrollIntoView({ block: "start" }));
    };
    window.addEventListener("hashchange", showWorks);
    document.addEventListener("click", jumpToWorks);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", showWorks);
      document.removeEventListener("click", jumpToWorks);
    };
  }, []);
  return <div className={s.content}>
    <div className={s.tabs} role="tablist" aria-label="Author portfolio">
      {["Stories", "Posts"].map((label, i) => <button key={label} ref={el => { buttons.current[i] = el; }} type="button" id={`${id}-tab-${i}`} role="tab" aria-selected={active === i} aria-controls={`${id}-panel-${i}`} tabIndex={active === i ? 0 : -1} onClick={() => setActive(i)} onKeyDown={event => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        const next = event.key === "Home" ? 0 : event.key === "End" ? 1 : 1 - i;
        setActive(next); buttons.current[next]?.focus();
      }}>{label}</button>)}
    </div>
    <div id={`${id}-panel-0`} role="tabpanel" aria-labelledby={`${id}-tab-0`} hidden={active !== 0}>{works}</div>
    <div id={`${id}-panel-1`} role="tabpanel" aria-labelledby={`${id}-tab-1`} hidden={active !== 1} className={s.posts}><h2>From this voice.</h2>{posts}</div>
  </div>;
}
