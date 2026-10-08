import { sql } from "@/lib/db";
import type { BookPreviewStory } from "@/components/story/BookPreview";

export type AuthorWork = BookPreviewStory & {
  chapter_count: number;
  is_short: boolean;
  chapters_public: boolean;
  genres: string[];
  rating: number | null;
  review_count: number;
};

// Public bibliography only: never pass chapter bodies or private drafts to a client.
export async function getAuthorWorks(authorId: string): Promise<AuthorWork[]> {
  return sql<AuthorWork[]>`
    SELECT s.id, s.slug, s.title, s.summary, s.cover_url, s.cover_style,
      u.name AS author, jsonb_array_length(s.chapters)::int AS chapter_count,
      (jsonb_array_length(s.chapters) = 1 AND btrim(COALESCE(s.chapters->0->>'title', '')) = '') AS is_short,
      s.chapters_public,
      ARRAY(SELECT g.name FROM genres g JOIN story_genres sg ON sg.genre_id = g.id
        WHERE sg.story_id = s.id ORDER BY g.name) AS genres,
      (SELECT ROUND(AVG(r.stars), 1)::float FROM reviews r WHERE r.story_id = s.id) AS rating,
      (SELECT COUNT(*)::int FROM reviews r WHERE r.story_id = s.id) AS review_count
    FROM stories s JOIN "user" u ON u.id = s.author_id
    WHERE s.author_id = ${authorId} AND s.status = 'published'
    ORDER BY s.created_at DESC, s.id
  `;
}
