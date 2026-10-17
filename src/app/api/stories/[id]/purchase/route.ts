import { stripeCheckoutEnabled } from "@/lib/payments/checkout-config";
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ApiError, requireSession, withErrors } from "@/lib/http";
import { expiryFor } from "@/lib/pricing";
import { quoteStoryPurchase, PaymentQuoteError } from "@/lib/payments/quote";
import { notify } from "@/lib/notify";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type StoryRow = {
  author_id: string;
  currency: string;
  status: string;
  chapters_public: boolean;
  offered_durations: string[];
  whole_prices: Record<string, number>;
  chapters: { prices?: Record<string, number> }[];
};

// A reader buys access. This is a MOCK checkout: no real money moves. The
// price is computed server-side from the story's pricing (never trusted from
// the client), a grant is recorded, and access is immediate.
//
// Body: { duration, scope: 'whole' } or { duration, scope: 'chapters', chapterIndexes: number[] }
export const POST = withErrors(async (
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  if (stripeCheckoutEnabled()) throw new ApiError(409, "Demo purchases are disabled. Use Stripe checkout.");
  const { id } = await params;
  if (!UUID_RE.test(id)) throw new ApiError(404, "Not found.");

  const session = await requireSession();
  const buyer = session.user.id;

  const [story] = await sql<StoryRow[]>`
    SELECT author_id, currency, status, chapters_public, offered_durations, whole_prices, chapters
    FROM stories WHERE id = ${id}
  `;
  if (!story || story.status !== "published") throw new ApiError(404, "Not found.");
  if (story.chapters_public) throw new ApiError(400, "These chapters are already free to read.");
  if (story.author_id === buyer) throw new ApiError(400, "You can't buy your own story.");

  const body: unknown = await req.json().catch(() => null);
  const [prior] = await sql<{ one: number }[]>`
    SELECT 1 AS one FROM access_grants
    WHERE story_id = ${id} AND user_id = ${buyer} LIMIT 1
  `;
  let quote;
  try {
    quote = quoteStoryPurchase({
      authorId: story.author_id, status: story.status, chaptersPublic: story.chapters_public,
      currency: story.currency, offeredDurations: story.offered_durations,
      wholePrices: story.whole_prices, chapters: story.chapters,
    }, buyer, body, !!prior);
  } catch (error) {
    if (error instanceof PaymentQuoteError) throw new ApiError(400, error.message);
    throw error;
  }
  if (quote.items.some(item => item.amountMajor > 2147483647)) throw new ApiError(400, "That price exceeds the supported mock purchase limit.");
  const rows = quote.items.map(item => ({
    story_id: id, user_id: buyer, scope: item.scope, chapter_index: item.chapterIndex,
    duration: item.duration, amount: item.amountMajor, expires_at: expiryFor(item.duration),
  }));

  await sql`
    INSERT INTO access_grants ${sql(
      rows,
      "story_id",
      "user_id",
      "scope",
      "chapter_index",
      "duration",
      "amount",
      "expires_at",
    )}
  `;

  const total = rows.reduce((s, r) => s + r.amount, 0);
  const boughtWhole = rows.some((r) => r.scope === "whole");

  await notify({
    userId: story.author_id,
    kind: "purchase",
    actorId: buyer,
    storyId: id,
    data: {
      whole: boughtWhole,
      units: rows.filter((r) => r.scope === "chapter").length,
      total,
    },
  });

  return NextResponse.json({ ok: true, total });
});

// The author revokes all of a reader's access to this story.
// Body: { userId }
export const DELETE = withErrors(async (
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id } = await params;
  if (!UUID_RE.test(id)) throw new ApiError(404, "Not found.");

  const session = await requireSession();
  const body = await req.json().catch(() => null);
  const userId = body && typeof body === "object" && !Array.isArray(body) ? body.userId : null;
  if (typeof userId !== "string" || !userId) throw new ApiError(400, "Missing reader.");

  const removed = await sql<{ id: string }[]>`
    DELETE FROM access_grants ag
    USING stories s
    WHERE ag.story_id = ${id}
      AND ag.user_id = ${userId}
      AND s.id = ag.story_id
      AND s.author_id = ${session.user.id}
    RETURNING ag.id
  `;
  if (removed.length === 0) throw new ApiError(403, "Not allowed.");

  return NextResponse.json({ ok: true });
});
