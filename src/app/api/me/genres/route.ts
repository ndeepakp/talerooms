import { NextResponse } from "next/server";
import { requireSession, withErrors } from "@/lib/http";
import { sql } from "@/lib/db";

const MIN_GENRES = 3;

export const POST = withErrors(async function POST(req: Request) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  const { genreIds } = await req.json();
  const ids = Array.isArray(genreIds)
    ? [...new Set(genreIds.filter((g) => Number.isInteger(g)))]
    : [];

  if (ids.length < MIN_GENRES) {
    return NextResponse.json(
      { error: `Please pick at least ${MIN_GENRES} genres.` },
      { status: 400 },
    );
  }

  const userId = session.user.id;
  await sql`DELETE FROM user_genres WHERE user_id = ${userId}`;
  const rows = ids.map((g: number) => ({ user_id: userId, genre_id: g }));
  await sql`INSERT INTO user_genres ${sql(rows, "user_id", "genre_id")} ON CONFLICT DO NOTHING`;

  return NextResponse.json({ ok: true });
});
