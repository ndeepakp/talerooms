import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ApiError, requireSession, withErrors } from "@/lib/http";
import { isAccent, isBackground, isShelf, isThemeMode } from "@/lib/appearance";

// Saves the signed-in user's appearance preferences. These sync to their
// account, so the look follows them to every device.
export const PUT = withErrors(async (req: Request) => {
  const session = await requireSession();

  const body = await req.json().catch(() => ({}));
  if (!isThemeMode(body.themeMode)) {
    throw new ApiError(400, "Unknown theme mode.");
  }
  if (!isAccent(body.accent)) {
    throw new ApiError(400, "Unknown accent colour.");
  }
  if (!isBackground(body.background)) {
    throw new ApiError(400, "Unknown background.");
  }
  if (!isShelf(body.shelf)) {
    throw new ApiError(400, "Unknown shelf style.");
  }

  await sql`
    UPDATE "user"
    SET theme_mode = ${body.themeMode},
        accent_color = ${body.accent},
        background_preset = ${body.background},
        shelf_style = ${body.shelf}
    WHERE id = ${session.user.id}
  `;

  return NextResponse.json({ ok: true });
});
