import Link from "next/link";
import { SignOutButton } from "./SignOutButton";
import { accountIsActive } from "@/lib/account-policy";
import { getAccountSession } from "@/lib/account-session";
import { sql } from "@/lib/db";
import { AppNavigation } from "@/components/layout/AppNavigation";

// Keep authentication and profile resolution on the server.
export async function TopBar() {
  const session = await getAccountSession();
  if (!session) return null;
  if (!accountIsActive(session.user)) return <header className="flex flex-wrap items-center justify-between gap-3 border-b border-ui px-6 py-3"><Link href="/" className="font-semibold text-ink">talerooms.</Link><div className="flex items-center gap-4"><Link href="/verify-email" className="text-sm text-ink underline">Verify your email</Link><SignOutButton/></div></header>;
  const [me] = await sql<{ username: string | null }[]>`
    SELECT username FROM "user" WHERE id = ${session.user.id}
  `;
  const profileHref = me?.username ? `/${me.username}` : `/users/${session.user.id}`;
  return <><AppNavigation profileHref={profileHref} user={session.user} />{!session.user.emailVerified && <aside className="border-b border-warning bg-warning-soft px-6 py-3 text-sm text-warning">Please verify your email before {new Date(session.user.verificationGraceUntil!).toLocaleDateString("en-GB", { timeZone: "UTC" })} to keep your account active. <Link href="/verify-email" className="font-medium underline">Verify now</Link></aside>}</>;
}
