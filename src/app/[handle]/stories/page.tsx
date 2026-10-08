import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getAuthorWorks } from "@/lib/profile";
import { AuthorWorks } from "@/components/profile/AuthorWorks";
import styles from "@/components/profile/Profile.module.css";

export const dynamic = "force-dynamic";

export default async function HandleStoriesPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const [user] = await sql<{ id: string; name: string | null; username: string | null }[]>`
    SELECT id, name, username FROM "user" WHERE lower(username) = lower(${handle})
  `;
  if (!user) notFound();

  const stories = await getAuthorWorks(user.id);
  return <main className={styles.page}><div className={styles.archive}>
    <h1>Stories by {user.name ?? "this writer"}</h1>
    <Link href={`/${user.username ?? handle}`}>← Back to ${user.username ?? handle}’s profile</Link>
    <AuthorWorks stories={stories} isSelf={session.user.id === user.id} />
  </div></main>;
}
