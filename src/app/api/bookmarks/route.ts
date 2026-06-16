import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ApiError, requireSession, withErrors } from "@/lib/http";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_QUOTE = 300;

// Create a bookmark: the reader has selected a word/phrase in a chapter; we
// store the quoted text so it can be found and highlighted later.
export const POST = withErrors(async (req: Request) => {
  const session = await requireSession();
  const { storyId, chapterIndex, quote, occurrence } = await req.json().catch(() => ({}));

  if (typeof storyId !== "string" || !UUID_RE.test(storyId)) {
    throw new ApiError(400, "Bad story.");
  }
  if (!Number.isInteger(chapterIndex) || chapterIndex < 0) {
    throw new ApiError(400, "Bad chapter.");
  }
  const text = typeof quote === "string" ? quote.trim().replace(/\s+/g, " ") : "";
  if (!text) throw new ApiError(400, "Select some text to bookmark.");
  if (text.length > MAX_QUOTE) throw new ApiError(400, "That selection is too long.");
  // Which occurrence of `text` within the chapter this points at (0-based), so
  // repeated phrases jump to the right spot.
  const occ = Number.isInteger(occurrence) && occurrence >= 0 ? occurrence : 0;

  const [row] = await sql<{ id: string; created_at: string }[]>`
    INSERT INTO bookmarks (user_id, story_id, chapter_index, quote, occurrence)
    VALUES (${session.user.id}, ${storyId}, ${chapterIndex}, ${text}, ${occ})
    RETURNING id, created_at
  `;

  return NextResponse.json({
    id: row.id,
    quote: text,
    chapter_index: chapterIndex,
    occurrence: occ,
  });
});
