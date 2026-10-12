import { requirePageSession } from "@/lib/account-session";
import { getAppearance } from "@/lib/get-appearance";
import { SettingsForm } from "./SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await requirePageSession();

  const appearance = await getAppearance(session);

  return <SettingsForm userId={session.user.id} initial={appearance} />;
}
