import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";
import { AppNavigation } from "@/components/layout/AppNavigation";

// Keep authentication and profile resolution on the server.
export async function TopBar() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const [me] = await sql<{ username: string | null }[]>`
    SELECT username FROM "user" WHERE id = ${session.user.id}
  `;
  const profileHref = me?.username ? `/${me.username}` : `/users/${session.user.id}`;
  return <AppNavigation profileHref={profileHref} user={session.user} />;
}
