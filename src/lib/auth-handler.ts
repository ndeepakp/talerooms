import { createHash } from "node:crypto";
import { auth, trustedOrigins } from "@/lib/auth";
import { sql } from "@/lib/db";
import { accountIsActive, normalizeEmail } from "@/lib/account-policy";
import { sessionAccountState } from "@/lib/account-session";
import { verificationEmailEnabled } from "@/lib/auth-config";

const otpPaths = new Set(["/email-otp/send-verification-otp", "/email-otp/verify-email", "/email-otp/request-email-change", "/email-otp/change-email"]);
const pendingPaths = new Set(["/get-session", "/sign-out", "/sign-in/email", "/sign-up/email", "/sign-in/social"]);
const fail = (status: number, message: string, code = "AUTH_REQUEST_REJECTED") =>
  Response.json({ message, code }, { status, headers: { "Cache-Control": "no-store" } });

/** Serialize OTP operations across instances, not merely inside one process.
 * Better Auth owns code hashing, expiry, verification and session cookies.
 * This boundary binds operations to the signed-in account, rotates old codes,
 * applies durable quotas, and prevents concurrent code consumption/retries.
 */
export function guardedAuthHandler(handler: (request: Request) => Promise<Response>) {
  return async (request: Request): Promise<Response> => {
    const path = new URL(request.url).pathname.replace(/^\/api\/auth/, "");
    if (path.startsWith("/email-otp/") && !otpPaths.has(path) ||
        path === "/sign-in/email-otp" || path === "/verify-email" || path === "/send-verification-email") {
      return fail(404, "This authentication flow is not available.");
    }
    try {
      if (path === "/sign-up/email" && !verificationEmailEnabled()) {
        return fail(503, "Email signup is temporarily unavailable. Please try again later.");
      }
      if (otpPaths.has(path)) {
        if (request.method !== "POST") return fail(405, "Use POST for verification.");
        const origin = request.headers.get("origin");
        const originAllowed = origin && trustedOrigins.some(allowed => allowed.includes("*") ? new RegExp("^" + allowed.split("*").map(part => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("[^/]+") + "$").test(origin) : allowed === origin);
        if (!originAllowed) return fail(403, "Invalid request origin.");
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session) return fail(401, "Log in to continue email verification.");
        const state = await sessionAccountState(session.user.id);
        if (!state) return fail(401, "Log in again.");
        const body = await request.clone().json().catch(() => null);
        if (!body) return fail(400, "Invalid verification request.");
        const changing = path.endsWith("email-change") || path.endsWith("change-email");
        const sending = path.endsWith("send-verification-otp") || path.endsWith("request-email-change");
        const currentEmail = normalizeEmail(session.user.email);
        const target = changing ? normalizeEmail(body.newEmail) : normalizeEmail(body.email);
        if (!target || target.length > 254 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(target)) return fail(400, "Enter a valid email address.");
        if (!changing && (target !== currentEmail || sending && body.type !== "email-verification")) {
          return fail(403, "Verify the email belonging to your account.");
        }
        if (changing && state.emailVerified) return fail(403, "Email correction is available only before verification.");
        if (changing) {
          const [taken] = await sql<{ id: string }[]>`SELECT id FROM "user" WHERE lower(email) = ${target} AND id <> ${session.user.id}`;
          if (taken) return fail(400, "Cannot use that email address. If it belongs to another account, use that account’s original login.");
        }
        if (sending && state.emailVerified) return fail(400, "Your email is already verified.");
        if (!sending && !/^\d{6}$/.test(body.otp ?? "")) return fail(400, "Enter the six-digit code.");
        if (sending && !verificationEmailEnabled()) return fail(503, "Email delivery is temporarily unavailable. Please try again later.");
        const lockKey = createHash("sha256").update(`otp:${session.user.id}`).digest("hex");
        return await sql.begin(async (tx) => {
          await tx`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`;
          const key = `${sending ? "send" : "verify"}:${lockKey}`;
          const [limit] = await tx<{ requests: number; last_sent_at: Date | null }[]>`
            INSERT INTO auth_verification_limits (key, requests, last_sent_at)
            VALUES (${key}, 1, ${sending ? new Date() : null})
            ON CONFLICT (key) DO UPDATE SET
              requests = CASE WHEN auth_verification_limits.window_start < now() - interval '1 hour' THEN 1 ELSE auth_verification_limits.requests + 1 END,
              window_start = CASE WHEN auth_verification_limits.window_start < now() - interval '1 hour' THEN now() ELSE auth_verification_limits.window_start END
            RETURNING requests, last_sent_at
          `;
          const quota = sending ? 10 : 30;
          // The first insertion records its timestamp; only subsequent requests
          // need to compare that timestamp against the resend cooldown.
          if (limit.requests > quota || sending && limit.requests > 1 && limit.last_sent_at && Date.now() - new Date(limit.last_sent_at).getTime() < 60000) {
            return new Response(JSON.stringify({ message: "Please wait before requesting another code.", code: "TOO_MANY_REQUESTS" }),
              { status: 429, headers: { "Content-Type": "application/json", "Retry-After": "60", "Cache-Control": "no-store" } });
          }
          if (sending) {
            await tx`UPDATE auth_verification_limits SET last_sent_at = now() WHERE key = ${key}`;
            const identifier = changing ? `change-email-otp-${currentEmail}-${target}` : `email-verification-otp-${currentEmail}`;
            // Plugin code operations use their own connection. Clear superseded
            // codes there before delegation while holding our advisory lock.
            await sql`DELETE FROM verification WHERE identifier = ${identifier}`;
          }
          const response = await handler(request);
          return response;
        });
      }
      const session = await auth.api.getSession({ headers: request.headers });
      if (session && !pendingPaths.has(path) && !path.startsWith("/callback/")) {
        const state = await sessionAccountState(session.user.id);
        if (!state || !accountIsActive(state)) return fail(403, "Verify your email to activate your account.", "EMAIL_VERIFICATION_REQUIRED");
      }
      return await handler(request);
    } catch {
      return fail(503, "Authentication is temporarily unavailable. Please try again.");
    }
  };
}
