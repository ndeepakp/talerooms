import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ApiError, requireSession, withErrors } from "@/lib/http";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Records the chapter a reader most recently opened in a story, powering the
// "continue from there" prompt on the home page.
export const POST = withErrors(async (
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id } = await params;
  if (!UUID_RE.test(id)) throw new ApiError(404, "Not found.");

  const session = await requireSession();
  const { chapterIndex, pageIndex, pageCount } = (await req.json().catch(() => null)) ?? {};
  if (!Number.isSafeInteger(chapterIndex) || chapterIndex < 0) {
    throw new ApiError(400, "Bad chapter.");
  }
  // Page within the chapter (auto page bookmark). Optional; defaults to 0.
  const page = Number.isInteger(pageIndex) && pageIndex >= 0 ? pageIndex : 0;

  if (pageCount !== undefined && (!Number.isSafeInteger(pageCount) || pageCount < 1 || pageCount > 100000 || page >= pageCount)) {
    throw new ApiError(400, "Bad page count.");
  }
  const count = pageCount ?? null;
  await sql`
    INSERT INTO reading_progress (user_id, story_id, chapter_index, page_index, page_count)
    VALUES (${session.user.id}, ${id}, ${chapterIndex}, ${page}, ${count})
    ON CONFLICT (user_id, story_id) DO UPDATE
      SET chapter_index = ${chapterIndex}, page_index = ${page}, page_count = ${count}, updated_at = now()
  `;

  return NextResponse.json({ ok: true });
});
