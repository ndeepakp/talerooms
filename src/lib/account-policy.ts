export type AccountState = { emailVerified: boolean; verificationGraceUntil?: Date | string | null };

export function accountIsActive(user: AccountState, now = new Date()): boolean {
  if (user.emailVerified) return true;
  const expiry = user.verificationGraceUntil ? new Date(user.verificationGraceUntil).getTime() : 0;
  return Number.isFinite(expiry) && expiry > now.getTime();
}

export function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}
