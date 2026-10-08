import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";
import { FollowButton } from "@/components/profile/FollowButton";
import { Avatar } from "@/components/layout/Avatar";
import { AnalyticsPanel } from "@/components/profile/AnalyticsPanel";
import { SubscribeButton } from "@/components/profile/SubscribeButton";
import { ReportButton } from "@/components/profile/ReportButton";
import { PostsSection } from "@/components/post/PostsSection";
import { AuthorWorks } from "@/components/profile/AuthorWorks";
import { ProfileContent } from "@/components/profile/ProfileContent";
import { PublicNavigation, PublicFooter } from "@/components/layout/PublicNavigation";
import { getAuthorWorks } from "@/lib/profile";
import { ACCENTS } from "@/lib/appearance";
import styles from "@/components/profile/Profile.module.css";
import { getPosts } from "@/lib/posts";
import { formatPrice } from "@/lib/pricing";

export const dynamic = "force-dynamic";

// Public SEO + social metadata for author profiles.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const [u] = await sql<
    { name: string | null; username: string | null; bio: string | null; image: string | null }[]
  >`SELECT name, username, bio, image FROM "user" WHERE lower(username) = lower(${handle})`;
  if (!u) return { title: "Profile · Talerooms" };
  const display = u.name ?? (u.username ? `@${u.username}` : "A writer");
  const description = (u.bio || `${display} on Talerooms.`).slice(0, 200);
  const images = u.image ? [{ url: u.image }] : undefined;
  return {
    title: `${display} (@${u.username ?? handle}) · Talerooms`,
    description,
    openGraph: { title: display, description, type: "profile", images },
    twitter: {
      card: u.image ? "summary" : "summary",
      title: display,
      description,
      images: u.image ? [u.image] : undefined,
    },
  };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;

  // Session is optional — profiles are public (indexable + shareable).
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user.id ?? null;

  const [user] = await sql<
    {
      id: string;
      name: string | null;
      username: string | null;
      bio: string | null;
      about: string | null;
      subscription_price: number | null;
      accent_color: string | null;
      image: string | null;
    }[]
  >`
    SELECT id, name, username, bio, about, subscription_price, accent_color, image
    FROM "user" WHERE lower(username) = lower(${handle})
  `;
  if (!user) notFound();

  const id = user.id;
  const h = user.username ?? handle;
  const isSelf = userId === id;

  // The viewer's active subscription to this author (days remaining + whether
  // they've cancelled future renewal), if any.
  let subDaysLeft: number | null = null;
  let subCancelled = false;
  if (!isSelf && user.subscription_price && userId) {
    const [row] = await sql<{ days: number; cancelled: boolean }[]>`
      SELECT CEIL(EXTRACT(EPOCH FROM (expires_at - now())) / 86400)::int AS days,
             cancelled
      FROM subscriptions
      WHERE subscriber_id = ${userId} AND author_id = ${id}
        AND expires_at > now()
    `;
    subDaysLeft = row?.days ?? null;
    subCancelled = row?.cancelled ?? false;
  }

  // How many readers currently subscribe to this user — public for everyone.
  const [subRow] = await sql<{ c: number }[]>`
    SELECT COUNT(*)::int AS c FROM subscriptions
    WHERE author_id = ${id} AND expires_at > now()
  `;
  const subscriberCount = subRow?.c ?? 0;

  const [{ followers }] = await sql<{ followers: number }[]>`
    SELECT COUNT(*)::int AS followers FROM follows WHERE following_id = ${id}
  `;
  const [{ following }] = await sql<{ following: number }[]>`
    SELECT COUNT(*)::int AS following FROM follows WHERE follower_id = ${id}
  `;

  const stories = await getAuthorWorks(id);
  const restrictedCount = stories.filter(story => !story.chapters_public && story.chapter_count > 0).length;
  const authorAccent = ACCENTS.find(accent => accent.id === user.accent_color)?.swatch ?? "#047857";
  const hasSidebar = isSelf || !!user.about?.trim() || (user.subscription_price ?? 0) > 0;

  // Only author-pinned notes from published works become public testimonials.
  const notes = await sql<{
    id: string; stars: number; liked: string; reader: string | null;
    story_title: string; story_id: string; slug: string | null;
  }[]>`
    SELECT r.id, r.stars::float AS stars, r.liked, u.name AS reader,
      s.title AS story_title, s.id AS story_id, s.slug
    FROM reviews r JOIN stories s ON s.id = r.story_id JOIN "user" u ON u.id = r.user_id
    WHERE s.author_id = ${id} AND s.status = 'published' AND r.pinned
      AND length(btrim(COALESCE(r.liked, ''))) > 0 AND r.user_id <> ${id}
    ORDER BY r.updated_at DESC, r.id LIMIT 3
  `;

  // The author's own private drafts — shown only to them.
  const drafts = isSelf
    ? await sql<{ id: string; title: string; summary: string }[]>`
        SELECT id, title, summary
        FROM stories
        WHERE author_id = ${id} AND status = 'draft'
          AND (draft_expires_at IS NULL OR draft_expires_at > now())
        ORDER BY created_at DESC
      `
    : [];

  let isFollowing = false;
  if (userId && !isSelf) {
    const [row] = await sql<{ one: number }[]>`
      SELECT 1 AS one FROM follows WHERE follower_id = ${userId} AND following_id = ${id}
    `;
    isFollowing = !!row;
  }

  // This user's community posts. An empty viewer id leaves the per-viewer flags
  // (liked/mine) false for logged-out visitors.
  const posts = await getPosts({ viewerId: userId ?? "", authorId: id });

  return <>
    {!session && <PublicNavigation />}
    <main className={styles.page} style={{ "--author-accent": authorAccent } as CSSProperties}>
      <div className={styles.inner}>
        <header className={styles.hero}>
          <div className={styles.banner}>
            <p>{stories.length > 0 ? "Original stories. A singular voice." : "Every voice has a place."}</p>
            <svg viewBox="0 0 80 56" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="M40 12C28 4 14 6 4 10v36c12-4 26-4 36 4 10-8 24-8 36-4V10C64 6 52 4 40 12Z"/><path d="M40 12v38M13 18c6-2 13-1 20 2M13 25c6-2 13-1 20 2M47 20c7-3 14-4 20-2M47 27c7-3 14-4 20-2"/></svg>
          </div>
          <div className={styles.identity}>
            <div className={styles.nameRow}>
              <Avatar src={user.image} name={user.name} size={80} />
              <div className={styles.name}><h1>{user.name ?? "A voice on Talerooms"}</h1>{user.username && <p className={styles.handle}>${user.username}</p>}</div>
              <div className={styles.actions}>{isSelf ? <Link href={`/${h}/edit`} className={styles.edit}>Edit profile</Link> : <><FollowButton userId={id} initialFollowing={isFollowing} isLoggedIn={!!session} />{!!user.subscription_price && user.subscription_price > 0 && <a href="#membership" className={styles.edit}>Membership</a>}</>}</div>
            </div>
            {user.bio && <p className={styles.bio}>{user.bio}</p>}
            <div className={styles.stats} aria-label="Profile statistics">
              <a href="#works"><strong>{stories.length}</strong> {stories.length === 1 ? "story" : "stories"}</a>
              <Link href={`/${h}/connections?tab=followers`}><strong>{followers}</strong> {followers === 1 ? "follower" : "followers"}</Link>
              <Link href={`/${h}/connections?tab=following`}><strong>{following}</strong> following</Link>
              <span><strong>{subscriberCount}</strong> {subscriberCount === 1 ? "subscriber" : "subscribers"}</span>
            </div>
          </div>
        </header>

        <div className={`${styles.layout} ${hasSidebar ? "" : styles.wide}`}>
          <div>
            <ProfileContent works={<AuthorWorks stories={stories} isSelf={isSelf} />} posts={<PostsSection posts={posts} emptyText={isSelf ? "You haven't posted yet." : "No posts yet."} />} />
            {notes.length > 0 && <section className={styles.notes} aria-labelledby="reader-notes-heading">
              <p className={styles.eyebrow}>Selected by the author</p><h2 id="reader-notes-heading">In the readers’ words.</h2>
              <div className={styles.notesGrid}>{notes.map(note => <figure key={note.id} className={styles.quote}>
                <p aria-label={`${note.stars} out of 5 stars`}>★ {note.stars.toFixed(1)}</p><blockquote>“{note.liked}”</blockquote>
                <figcaption><p>{note.reader ?? "A reader"} · on <Link href={`/stories/${note.slug ?? note.story_id}`}>{note.story_title}</Link></p></figcaption>
              </figure>)}</div>
            </section>}
            {isSelf && drafts.length > 0 && <section className={styles.drafts} aria-labelledby="private-drafts-heading">
              <p className={styles.eyebrow}>Only you can see these</p><h2 id="private-drafts-heading">Still taking shape.</h2>
              <ul>{drafts.map(draft => <li key={draft.id}><Link href={`/stories/${draft.id}/edit`}>{draft.title || "Untitled"}<span>Continue writing ↗</span></Link></li>)}</ul>
            </section>}
          </div>
          {hasSidebar && <aside className={styles.sidebar} aria-label="About and membership">
            {user.subscription_price && user.subscription_price > 0 ? <section id="membership" className={styles.membership} aria-labelledby="membership-heading">
              <p className={styles.eyebrow}>The reader’s circle</p><h2 id="membership-heading">Stay close to the story.</h2>
              <p className={styles.price}>{formatPrice(user.subscription_price)} <small>/ 30 days</small></p>
              <ul className={styles.perks}>
                <li>{restrictedCount > 0 ? `${restrictedCount} ${restrictedCount === 1 ? "story with" : "stories with"} members-only chapters` : "Members-only stories will appear here when published"}</li>
                <li>Access to this author’s restricted chapters during your membership</li>
              </ul>
              <div className={styles.memberAction}>{isSelf ? <Link href={`/${h}/edit`} className="btn-primary">Manage membership</Link> : session ? <SubscribeButton authorId={id} price={user.subscription_price} initialDaysLeft={subDaysLeft} initialCancelled={subCancelled} /> : <Link href="/login" className="btn-primary">Log in to subscribe</Link>}</div>
              <p className={styles.finePrint}>Membership checkout is currently a demo. No real payment is taken.</p>
            </section> : isSelf ? <section className={styles.membership}><p className={styles.eyebrow}>Your reader’s circle</p><h2>Make room for your readers.</h2><p className={styles.finePrint}>Add a membership price in your profile when you’re ready to offer members-only chapters.</p><div className={`${styles.memberAction} mt-5`}><Link href={`/${h}/edit`} className="btn-primary">Set up membership</Link></div></section> : null}
            {user.about && <section className={styles.about}><p className={styles.eyebrow}>Behind the words</p><h2>Meet this voice.</h2><p>{user.about}</p></section>}
          </aside>}
        </div>
        {isSelf && <div className={styles.owner}><p className={styles.eyebrow}>Your author dashboard · only you</p><AnalyticsPanel /></div>}
        {session && !isSelf && <div className={styles.report}><ReportButton userId={id} /></div>}
      </div>
    </main>
    {!session && <PublicFooter />}
  </>;
}
