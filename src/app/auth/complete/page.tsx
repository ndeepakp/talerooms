import { redirect } from "next/navigation";
import { requirePageSession } from "@/lib/account-session";
import { sql } from "@/lib/db";
export default async function CompleteAuthPage() {
  const session = await requirePageSession();
  const [user] = await sql<{ username: string | null }[]>`SELECT username FROM "user" WHERE id = ${session.user.id}`;
  redirect(user?.username ? "/feed" : "/onboarding");
}
