"use client";

import { useState, type ReactNode } from "react";
import styles from "./Discovery.module.css";

export function GalleryTabs({ stories, community }: { stories: ReactNode; community: ReactNode }) {
  const [active, setActive] = useState("stories");
  return <>
    <div className={styles.toolbar}>
      <div className={styles.tabs} role="tablist" aria-label="Reading room">
        {[['stories', 'Stories'], ['community', 'Community']].map(([key, label]) =>
          <button key={key} id={`feed-${key}-tab`} type="button" role="tab" aria-selected={active === key} aria-controls={`feed-${key}-panel`} tabIndex={active === key ? 0 : -1}
            onClick={() => setActive(key)} onKeyDown={e => {
              if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
                e.preventDefault();
                const next = e.key === 'Home' ? 'stories' : e.key === 'End' ? 'community' : active === 'stories' ? 'community' : 'stories';
                setActive(next);
                document.getElementById(`feed-${next}-tab`)?.focus();
              }
            }}>{label}</button>)}
      </div>
    </div>
    <div id="feed-stories-panel" role="tabpanel" aria-labelledby="feed-stories-tab" hidden={active !== 'stories'} tabIndex={0}>{stories}</div>
    <div id="feed-community-panel" role="tabpanel" aria-labelledby="feed-community-tab" hidden={active !== 'community'} tabIndex={0} className={styles.community}>{community}</div>
  </>;
}
