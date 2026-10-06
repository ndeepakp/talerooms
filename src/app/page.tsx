import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";
import { LandingWelcome, type LandingStory } from "@/components/story/LandingWelcome";

export const metadata: Metadata = {
  title: "Talerooms — Where original stories find their people",
  description: "Discover original fiction, follow the writers you love, and return for the next chapter. Publish your stories, keep your rights, and build your readership.",
};

export default async function Home() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect("/feed");

  const stories = await sql<LandingStory[]>`
    SELECT s.id, s.slug, s.title, s.summary, u.name AS author, s.cover_url, s.cover_style
    FROM stories s
    JOIN "user" u ON u.id = s.author_id
    WHERE s.status = 'published'
    ORDER BY (SELECT COUNT(*) FROM story_views sv WHERE sv.story_id = s.id) DESC,
             s.created_at DESC
    LIMIT 4
  `;

  return <LandingWelcome stories={stories} />;
}
