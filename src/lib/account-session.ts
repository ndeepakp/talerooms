import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";
import { accountIsActive, type AccountState } from "@/lib/account-policy";

export async function sessionAccountState(userId: string): Promise<AccountState | null> {
  const [row] = await sql<AccountState[]>`
    SELECT "emailVerified", "verificationGraceUntil" FROM "user" WHERE id = ${userId}
  `;
  return row ?? null;
}

// Verification always comes from the current database record, even when a
// client holds a stale session snapshot. Memoized only within this server render.
export const getAccountSession = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const state = await sessionAccountState(session.user.id);
  if (!state) return null;
  return { ...session, user: { ...session.user, ...state } };
});

export async function getActiveSession() {
  const session = await getAccountSession();
  return session && accountIsActive(session.user) ? session : null;
}

export async function requirePageSession() {
  const session = await getAccountSession();
  if (!session) redirect("/login");
  if (!accountIsActive(session.user)) redirect("/verify-email");
  return session;
}
