import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";
import { LibraryShelf, type LibraryStory } from "@/components/story/LibraryShelf";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  const me = session.user.id;

  // Everything the reader has opened (others' published stories), newest first.
  // `has_new` is an unseen "new chapter" notification for that story — the same
  // signal the serial loop emits when an author drops a chapter.
  const stories = await sql<LibraryStory[]>`
    SELECT
      s.id, s.slug, s.title, s.summary,
      u.name AS author, u.username AS author_handle,
      s.cover_url, s.cover_style,
      rp.chapter_index,
      jsonb_array_length(s.chapters)::int AS chapter_count,
      EXISTS (
        SELECT 1 FROM notifications n
        WHERE n.user_id = ${me} AND n.kind = 'new_chapter'
          AND n.story_id = s.id AND NOT n.seen
      ) AS has_new
    FROM reading_progress rp
    JOIN stories s ON s.id = rp.story_id
    JOIN "user" u ON u.id = s.author_id
    WHERE rp.user_id = ${me}
      AND s.status = 'published'
      AND s.author_id <> ${me}
    ORDER BY rp.updated_at DESC
  `;

  return <LibraryShelf stories={stories} />;
}
