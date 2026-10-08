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

  const collections = await sql<{ id: string; name: string }[]>`
    SELECT id, name FROM collections WHERE user_id = ${me} ORDER BY created_at DESC
  `;
  // Project public metadata only. Reading, paid access and collections are all
  // scoped to this session; chapter bodies never cross the client boundary.
  const stories = await sql<LibraryStory[]>`
    SELECT s.id, s.slug, s.title, s.summary,
      u.name AS author, u.username AS author_handle, s.cover_url, s.cover_style,
      rp.chapter_index, rp.page_index, rp.page_count, rp.completed_chapter_count,
      jsonb_array_length(s.chapters)::int AS chapter_count,
      ARRAY(SELECT cs.collection_id::text FROM collection_stories cs
        JOIN collections c ON c.id = cs.collection_id
        WHERE cs.story_id = s.id AND c.user_id = ${me}) AS collection_ids,
      EXISTS(SELECT 1 FROM access_grants g WHERE g.story_id = s.id
        AND g.user_id = ${me} AND g.amount > 0) AS purchased,
      EXISTS(SELECT 1 FROM access_grants g WHERE g.story_id = s.id
        AND g.user_id = ${me} AND g.amount > 0
        AND (g.expires_at IS NULL OR g.expires_at > now())) AS access_active,
      (EXISTS(SELECT 1 FROM notifications n WHERE n.user_id = ${me}
        AND n.kind = 'new_chapter' AND n.story_id = s.id AND NOT n.seen)
        OR COALESCE(rp.completed_chapter_count < jsonb_array_length(s.chapters), false)) AS has_new
    FROM stories s JOIN "user" u ON u.id = s.author_id
    LEFT JOIN reading_progress rp ON rp.story_id = s.id AND rp.user_id = ${me}
    WHERE s.status = 'published' AND s.author_id <> ${me}
      AND (rp.user_id IS NOT NULL
        OR EXISTS(SELECT 1 FROM access_grants g WHERE g.story_id = s.id AND g.user_id = ${me} AND g.amount > 0)
        OR EXISTS(SELECT 1 FROM collection_stories cs JOIN collections c ON c.id = cs.collection_id
          WHERE cs.story_id = s.id AND c.user_id = ${me}))
    ORDER BY rp.updated_at DESC NULLS LAST, s.created_at DESC, s.id
  `;
  return <LibraryShelf stories={stories} collections={collections} />;
}
