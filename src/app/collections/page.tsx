import { redirect } from "next/navigation";
import { requirePageSession } from "@/lib/account-session";
import { handleByUserId } from "@/lib/handles";

export const dynamic = "force-dynamic";

// "Collections" in the menu → the signed-in user's handle-based collections.
export default async function CollectionsRedirect() {
  const session = await requirePageSession();
  const handle = await handleByUserId(session.user.id);
  redirect(handle ? `/${handle}/collections` : "/feed");
}
