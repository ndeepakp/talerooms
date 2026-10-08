import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ApiError, requireSession, withErrors } from "@/lib/http";

export const POST = withErrors(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const session = await requireSession();
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new ApiError(404, "Not found.");
  const body = await req.json().catch(() => null);
  if (typeof body?.finished !== "boolean") throw new ApiError(400, "Choose a reading status.");
  const [progress] = await sql<{ completed_chapter_count: number | null }[]>`
    UPDATE reading_progress rp
    SET completed_chapter_count = CASE WHEN ${body.finished} THEN jsonb_array_length(s.chapters) ELSE NULL END,
        updated_at = now()
    FROM stories s
    WHERE rp.story_id = s.id AND rp.story_id = ${id} AND rp.user_id = ${session.user.id}
      AND s.status = 'published' AND s.author_id <> ${session.user.id}
      AND jsonb_array_length(s.chapters) > 0
    RETURNING rp.completed_chapter_count
  `;
  if (!progress) throw new ApiError(404, "Open this story before changing its reading status.");
  return NextResponse.json(progress);
});
