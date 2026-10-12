import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { requirePageSession } from "@/lib/account-session";
import { sql } from "@/lib/db";
import { Avatar } from "@/components/layout/Avatar";
import { StarRating } from "@/components/story/StarRating";
import { resolveStory, isUuid } from "@/lib/slug";

export const dynamic = "force-dynamic";

export default async function ReviewsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePageSession();
  const { id: param } = await params;

  const resolved = await resolveStory(param);
  if (!resolved) notFound();
  if (isUuid(param) && resolved.slug) redirect(`/stories/${resolved.slug}/reviews`);
  const id = resolved.id;

  const [story] = await sql<{ title: string }[]>`
    SELECT title FROM stories WHERE id = ${id}
  `;
  if (!story) notFound();

  const [agg] = await sql<{ avg: number | null; count: number }[]>`
    SELECT ROUND(AVG(stars), 1)::float AS avg, COUNT(*)::int AS count
    FROM reviews WHERE story_id = ${id}
  `;
  const reviews = await sql<{
    id: string;
    stars: number;
    liked: string | null;
    disliked: string | null;
    pinned: boolean;
    author: string | null;
    handle: string | null;
    image: string | null;
  }[]>`
    SELECT r.id, r.stars::float AS stars, r.liked, r.disliked, r.pinned,
           u.name AS author, u.username AS handle, u.image
    FROM reviews r JOIN "user" u ON u.id = r.user_id
    WHERE r.story_id = ${id}
    ORDER BY r.pinned DESC, r.updated_at DESC
  `;

  return (
    <div className="min-h-screen bg-[var(--page)] px-6 py-12">
      <div className="mx-auto w-full max-w-2xl">
        <Link
          href={`/stories/${id}`}
          className="text-sm font-medium text-muted [overflow-wrap:anywhere] hover:underline"
        >
          {story.title}
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-ink">
          Ratings &amp; reviews
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-muted">
          <StarRating value={agg.avg ?? 0} size={22} />
          <span className="text-lg font-semibold">{(agg.avg ?? 0).toFixed(1)}</span>
          <span className="text-subtle">
            · {agg.count} {agg.count === 1 ? "review" : "reviews"}
          </span>
        </div>

        {reviews.length === 0 ? (
          <p className="mt-8 text-muted">No reviews yet.</p>
        ) : (
          <ul className="mt-6 flex flex-col gap-4">
            {reviews.map((r) => (
              <li
                key={r.id}
                className="rounded-xl border border-ui bg-surface-raised p-4 [overflow-wrap:anywhere]"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar src={r.image} name={r.author} size={36} />
                    <div className="min-w-0">
                      <Link
                        href={`/${r.handle ?? ""}`}
                        className="text-sm font-medium text-ink hover:underline"
                      >
                        {r.author ?? "Reader"}
                      </Link>
                      <StarRating value={r.stars} size={14} />
                    </div>
                  </div>
                  {r.pinned && (
                    <span className="shrink-0 rounded-full bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning">
                      📌 Featured
                    </span>
                  )}
                </div>
                {r.liked && (
                  <p className="mt-2 text-sm text-ink-soft">
                    <span className="font-medium text-success">
                      Liked:
                    </span>{" "}
                    {r.liked}
                  </p>
                )}
                {r.disliked && (
                  <p className="mt-1 text-sm text-ink-soft">
                    <span className="font-medium text-danger">
                      Could be better:
                    </span>{" "}
                    {r.disliked}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
