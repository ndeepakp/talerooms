"use client";

import Link from "next/link";
import { useState } from "react";
import { BookPreview } from "@/components/story/BookPreview";
import type { AuthorWork } from "@/lib/profile";
import s from "./Profile.module.css";

const filters = [{ id: "all", label: "All works" }, { id: "serial", label: "Serials" }, { id: "short", label: "Short stories" }] as const;

export function AuthorWorks({ stories, isSelf = false }: { stories: AuthorWork[]; isSelf?: boolean }) {
  const [filter, setFilter] = useState<(typeof filters)[number]["id"]>("all");
  const matches = (story: AuthorWork, kind: typeof filter) => kind === "all" || (kind === "short" ? story.is_short : !story.is_short);
  const visible = stories.filter(story => matches(story, filter));
  return <section id="works" className={s.works} aria-label="Published works">
    <div className={s.sectionHeading}><div><p className={s.eyebrow}>The bibliography</p><h2>Worlds to step into.</h2></div><span className={s.count}>{stories.length} published {stories.length === 1 ? "work" : "works"}</span></div>
    <div className={s.filters} role="group" aria-label="Filter published works">
      {filters.map(item => <button key={item.id} type="button" aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>{item.label}<span>{stories.filter(story => matches(story, item.id)).length}</span></button>)}
    </div>
    {visible.length === 0 ? <div className={s.empty}>
      <h3>{stories.length ? `No ${filter === "short" ? "short stories" : "serials"} on this shelf yet.` : isSelf ? "Your first world belongs here." : "A story is taking shape."}</h3>
      <p>{stories.length ? "Explore the other works on this shelf." : isSelf ? "Publish a story and make this space your own." : "Published stories will appear here. Follow this voice to hear what comes next."}</p>
      {stories.length ? <button type="button" onClick={() => setFilter("all")}>Show all works</button> : isSelf ? <Link className="btn-primary" href="/write">Write a story</Link> : null}
    </div> : <div className={s.gallery}>
      {visible.map(story => <article key={story.id} className={s.bookCard}>
        <div className={s.bookArt}><BookPreview story={story} readLabel="Explore story" /></div>
        <div className={s.bookDetails}>
          <p className={s.bookKind}>{story.is_short ? "Short story" : story.chapter_count === 0 ? "Story introduction" : `${story.chapter_count} ${story.chapter_count === 1 ? "chapter" : "chapters"}`}</p>
          <Link href={`/stories/${story.slug ?? story.id}`} className={s.bookTitle}><h3>{story.title}</h3></Link>
          {story.genres.length > 0 && <p className={s.genres} title={story.genres.join(" · ")}>{story.genres.join(" · ")}</p>}
          <div className={s.bookMeta}><span>{story.chapter_count === 0 ? "Chapters coming soon" : story.chapters_public ? "Free to read" : "Members / passes"}</span>{story.rating !== null && <span aria-label={`${story.rating} out of 5 stars, ${story.review_count} reviews`}>★ {story.rating.toFixed(1)}</span>}</div>
        </div>
      </article>)}
    </div>}
  </section>;
}
