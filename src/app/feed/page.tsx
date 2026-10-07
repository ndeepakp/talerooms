import Link from "next/link";
import { redirect } from "next/navigation";
import { headers, cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getAppearance } from "@/lib/get-appearance";
import { DiscoveryFeed } from '@/components/feed/DiscoveryFeed';
import type { DiscoveryStory } from '@/lib/discovery';
import styles from '@/components/feed/Discovery.module.css';
import { WeekPanel, type WeekStats } from "@/components/feed/WeekPanel";
import { NewChapters, type NewChapterStory } from "@/components/feed/NewChapters";
import { ContinueReading } from "@/components/feed/ContinueReading";
import { PostsFeed } from "@/components/post/PostsFeed";
import { SideTabs } from "@/components/feed/SideTabs";
import { getPosts } from "@/lib/posts";

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  // Optional custom wallpaper for the feed page (set in Settings). Reuses the
  // already-resolved session so there's no extra auth lookup.
  const { feedWallpaper: wallpaper } = await getAppearance(session);

  // "Continue reading": the reader's most recently opened chapter, in a story
  // they don't own that's still published. New readers get nothing.
  const [resume] = await sql<
    { story_id: string; slug: string | null; title: string; author: string | null; chapter_index: number; chapter_title: string | null; chapter_count: number }[]
  >`
    SELECT rp.story_id, s.slug, s.title, u.name AS author,
           LEAST(rp.chapter_index, jsonb_array_length(s.chapters) - 1) AS chapter_index,
           s.chapters -> LEAST(rp.chapter_index, jsonb_array_length(s.chapters) - 1) ->> 'title' AS chapter_title,
           jsonb_array_length(s.chapters) AS chapter_count
    FROM reading_progress rp
    JOIN stories s ON s.id = rp.story_id
    JOIN "user" u ON u.id = s.author_id
    WHERE rp.user_id = ${session.user.id}
      AND s.status = 'published'
      AND s.author_id <> ${session.user.id}
      AND jsonb_array_length(s.chapters) > 0
    ORDER BY rp.updated_at DESC
    LIMIT 1
  `;

  // Community posts (newest first, all authors).
  const posts = await getPosts({ viewerId: session.user.id });

  // "Your week" — the reader's last-7-days activity for the feed right-rail panel.
  const me = session.user.id;
  const [reads] = await sql<{ n: number }[]>`
    SELECT COUNT(DISTINCT story_id)::int AS n FROM story_views
    WHERE viewer_id = ${me} AND created_at >= now() - interval '7 days'
  `;
  const [quiz] = await sql<{ total: number; correct: number }[]>`
    SELECT COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE a.choice = (q.value->>'answer')::int)::int AS correct
    FROM question_answers a
    JOIN stories s ON s.id = a.story_id
    CROSS JOIN LATERAL jsonb_array_elements(
      COALESCE(s.chapters -> a.chapter_index -> 'questions', '[]'::jsonb)
    ) q
    WHERE a.user_id = ${me}
      AND a.created_at >= now() - interval '7 days'
      AND q.value->>'id' = a.question_id
  `;
  const [ans] = await sql<{ n: number }[]>`
    SELECT COUNT(*)::int AS n FROM posts
    WHERE author_id = ${me} AND answer_story_id IS NOT NULL
      AND created_at >= now() - interval '7 days'
  `;
  const days = await sql<{ day: string }[]>`
    SELECT DISTINCT to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day
    FROM story_views WHERE viewer_id = ${me}
  `;
  const weekStats: WeekStats = {
    name: session.user.name ?? null,
    storiesRead: reads?.n ?? 0,
    quizzesTaken: quiz?.total ?? 0,
    quizScore: quiz && quiz.total > 0 ? Math.round((quiz.correct / quiz.total) * 100) : 0,
    answers: ans?.n ?? 0,
    readingDays: days.map(d => d.day),
  };

  // "New chapters for you": stories with unseen new_chapter notifications — the
  // serial loop's pull-back, surfaced as a strip at the top of the feed.
  const newChapters = await sql<NewChapterStory[]>`
    SELECT s.id, s.slug, s.title, s.summary, u.name AS author,
           s.cover_url, s.cover_style,
           COALESCE(rp.chapter_index, 0) AS chapter_index,
           COUNT(*)::int AS new_count
    FROM notifications n
    JOIN stories s ON s.id = n.story_id
    JOIN "user" u ON u.id = s.author_id
    LEFT JOIN reading_progress rp ON rp.story_id = s.id AND rp.user_id = ${me}
    WHERE n.user_id = ${me} AND n.kind = 'new_chapter' AND NOT n.seen
      AND s.status = 'published'
    GROUP BY s.id, u.name, rp.chapter_index
    ORDER BY MAX(n.created_at) DESC
    LIMIT 12
  `;

  const prefs = await sql<{ name: string }[]>`
    SELECT g.name FROM user_genres ug JOIN genres g ON g.id = ug.genre_id WHERE ug.user_id = ${me}
  `;
  // Only public metadata leaves the server. Chapter bodies are counted in SQL,
  // never serialized into discovery props, including restricted stories.
  const stories = await sql<DiscoveryStory[]>`
    SELECT s.id, s.slug, s.title, s.summary, u.name AS author, u.id AS author_id,
      u.username AS author_handle,
      COALESCE(array_agg(g.name) FILTER (WHERE g.name IS NOT NULL), '{}') AS genres,
      (SELECT ROUND(AVG(stars), 1) FROM reviews rv WHERE rv.story_id = s.id)::float AS rating,
      (SELECT COUNT(*) FROM reviews rv WHERE rv.story_id = s.id)::int AS rating_count,
      (SELECT COUNT(*) FROM story_views sv WHERE sv.story_id = s.id)::int AS views,
      (SELECT COUNT(*) FROM story_views sv WHERE sv.story_id = s.id AND sv.created_at >= now() - interval '7 days')::int AS recent_views,
      s.created_at::text, s.cover_url, s.cover_style, s.chapters_public, s.whole_prices, s.currency,
      EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = ${me} AND f.following_id = s.author_id) AS followed,
      COALESCE((SELECT SUM(CASE WHEN trim(regexp_replace(c->>'body', '<[^>]*>', ' ', 'g')) = '' THEN 0 ELSE cardinality(regexp_split_to_array(trim(regexp_replace(c->>'body', '<[^>]*>', ' ', 'g')), '[[:space:]]+')) END)
        FROM jsonb_array_elements(s.chapters) c), 0)::int AS word_count
    FROM stories s JOIN "user" u ON u.id = s.author_id
    LEFT JOIN story_genres sg ON sg.story_id = s.id
    LEFT JOIN genres g ON g.id = sg.genre_id
    WHERE s.status = 'published'
    GROUP BY s.id, u.id
    ORDER BY s.created_at DESC
  `;

  return (
    <div className={styles.page} style={wallpaper ? { backgroundImage: `url(${wallpaper})` } : undefined}>
      <div className={`${styles.container} ${wallpaper ? styles.wallpaper : ''}`}>
        <header className={styles.header}>
          <div><span className={styles.kicker}>Your reading room</span><h1>A story for every mood.</h1><p>Catch up with your favourite voices. Find a new world. Stay a little longer.</p></div>
          <div className={styles.actions}><Link href="/library" className="border border-ui bg-surface-raised">Your library</Link><Link href="/write" className="btn-primary">Write a story</Link></div>
        </header>
        {resume && (await cookies()).get('resume_dismissed')?.value !== `${resume.story_id}:${resume.chapter_index}` && <ContinueReading resume={resume}/>}
        <NewChapters stories={newChapters}/>
        <SideTabs tabs={[
          {key:'stories',label:'Stories',icon:'📚',content:<div className={styles.layout}><div className={styles.content}><DiscoveryFeed stories={stories} preferredGenres={prefs.map(p => p.name)}/></div><div className={styles.rail}><WeekPanel stats={weekStats}/></div></div>},
          {key:'posts',label:'Community',icon:'💬',content:<div className="max-w-2xl"><PostsFeed posts={posts}/></div>}
        ]}/>
      </div>
    </div>
  );
}
