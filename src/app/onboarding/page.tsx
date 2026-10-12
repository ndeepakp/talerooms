import { redirect } from "next/navigation";
import { requirePageSession } from "@/lib/account-session";
import { sql } from "@/lib/db";
import { OnboardingForm } from "./OnboardingForm";
export default async function OnboardingPage() {
  const session = await requirePageSession();
  const [user] = await sql<{ username: string | null }[]>`SELECT username FROM "user" WHERE id = ${session.user.id}`;
  if (user?.username) redirect("/feed");
  const genres = await sql<{ id: number; name: string }[]>`SELECT id, name FROM genres ORDER BY name`;
  return <OnboardingForm genres={genres} initialName={session.user.name}/>;
}
