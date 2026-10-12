import { requirePageSession } from "@/lib/account-session";
import { sql } from "@/lib/db";
import { StoryForm } from "./StoryForm";

export default async function WritePage() {
  await requirePageSession();

  const genres = await sql<{ id: number; name: string }[]>`
    SELECT id, name FROM genres ORDER BY name
  `;

  return <StoryForm genres={genres} />;
}
