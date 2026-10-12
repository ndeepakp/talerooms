import Link from "next/link";
import { requirePageSession } from "@/lib/account-session";
import { sql } from "@/lib/db";
import { SearchBar } from "@/components/layout/SearchBar";

export const dynamic = "force-dynamic";

type GenreHit = { id: number; name: string };
type UserHit = { id: string; name: string | null; username: string | null; bio: string | null };
type StoryHit = {
  id: string;
  title: string;
  summary: string;
  author: string | null;
  author_id: string;
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requirePageSession();

  const { q } = await searchParams;
  const raw = (q ?? "").trim();
  // A leading "$" means the reader is specifically after a handle.
  const handleOnly = raw.startsWith("$");
  const term = handleOnly ? raw.slice(1) : raw;

  let genres: GenreHit[] = [];
  let users: UserHit[] = [];
  let stories: StoryHit[] = [];

  if (term.length > 0) {
    const pattern = `%${term}%`;
    users = await sql<UserHit[]>`
      SELECT id, name, username, bio
      FROM "user"
      WHERE username ILIKE ${pattern}
         OR name ILIKE ${pattern}
         OR word_similarity(${term}, coalesce(name, '')) > 0.3
         OR word_similarity(${term}, coalesce(username, '')) > 0.3
      ORDER BY GREATEST(
        word_similarity(${term}, coalesce(username, '')),
        word_similarity(${term}, coalesce(name, ''))
      ) DESC
      LIMIT 10
    `;

    if (!handleOnly) {
      genres = await sql<GenreHit[]>`
        SELECT id, name FROM genres WHERE name ILIKE ${pattern} ORDER BY name LIMIT 10
      `;

      stories = await sql<StoryHit[]>`
        SELECT s.id, s.title, s.summary, u.name AS author, u.id AS author_id
        FROM stories s
        JOIN "user" u ON u.id = s.author_id
        WHERE s.status = 'published'
          AND (s.title ILIKE ${pattern} OR word_similarity(${term}, s.title) > 0.3)
        ORDER BY word_similarity(${term}, s.title) DESC, s.created_at DESC
        LIMIT 10
      `;
    }
  }

  return (
    <div className="min-h-screen bg-[var(--page)] px-6 py-12">
      <div className="mx-auto w-full max-w-5xl">
        <div>
          <SearchBar initial={raw} />
        </div>

        {term.length === 0 ? (
          <p className="mt-12 text-center text-muted">
            Search for a story title, a writer&apos;s name, or a $handle.
          </p>
        ) : (
          <>
            {!handleOnly && genres.length > 0 && (
              <section className="mt-8">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
                  Genres
                </h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {genres.map((g) => (
                    <Link
                      key={g.id}
                      href={`/genres/${g.id}`}
                      className="rounded-full border border-ui-strong px-3 py-1.5 text-sm text-ink-soft transition-colors hover:bg-surface-soft"
                    >
                      {g.name}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            <section className="mt-8">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
                People
              </h2>
              {users.length === 0 ? (
                <p className="mt-3 text-muted">No people found.</p>
              ) : (
                <ul className="mt-3 flex flex-col gap-2">
                  {users.map((u) => (
                    <li key={u.id}>
                      <Link
                        href={`/${u.username ?? u.id}`}
                        className="block rounded-2xl border border-ui bg-surface-raised p-4 transition-colors hover:border-ui-strong"
                      >
                        <span className="font-semibold text-ink">
                          {u.name ?? "Unknown writer"}
                        </span>{" "}
                        {u.username && (
                          <span className="text-sm text-muted">${u.username}</span>
                        )}
                        {u.bio && (
                          <p className="mt-1 line-clamp-2 text-sm text-muted">
                            {u.bio}
                          </p>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {!handleOnly && (
              <section className="mt-10">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
                  Stories
                </h2>
                {stories.length === 0 ? (
                  <p className="mt-3 text-muted">No stories found.</p>
                ) : (
                  <ul className="mt-3 flex flex-col gap-2">
                    {stories.map((s) => (
                      <li key={s.id}>
                        <Link
                          href={`/stories/${s.id}`}
                          className="block rounded-2xl border border-ui bg-surface-raised p-4 transition-colors hover:border-ui-strong"
                        >
                          <h3 className="font-semibold text-ink">
                            {s.title}
                          </h3>
                          <p className="mt-1 text-sm text-muted">
                            by {s.author ?? "Unknown"}
                          </p>
                          <p className="mt-1 line-clamp-2 text-sm text-muted">
                            {s.summary}
                          </p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
