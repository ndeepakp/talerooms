import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ApiError, requireSession, withErrors } from "@/lib/http";

type PushSub = {
  endpoint?: unknown;
  keys?: { p256dh?: unknown; auth?: unknown };
};

// Save (or refresh) the current user's push subscription for this device.
// Body: a PushSubscription JSON — { endpoint, keys: { p256dh, auth } }.
export const POST = withErrors(async (req: Request) => {
  const session = await requireSession();
  const sub = (await req.json().catch(() => ({}))) as PushSub;

  const endpoint = typeof sub.endpoint === "string" ? sub.endpoint : "";
  const p256dh = typeof sub.keys?.p256dh === "string" ? sub.keys.p256dh : "";
  const auth = typeof sub.keys?.auth === "string" ? sub.keys.auth : "";
  if (!endpoint || !p256dh || !auth) throw new ApiError(400, "Invalid subscription.");

  // One row per (user, endpoint); re-subscribing refreshes the keys.
  await sql`
    INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
    VALUES (${session.user.id}, ${endpoint}, ${p256dh}, ${auth})
    ON CONFLICT (user_id, endpoint)
    DO UPDATE SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth
  `;

  return NextResponse.json({ ok: true });
});

// Remove a device's subscription (user turned notifications off).
// Body: { endpoint }.
export const DELETE = withErrors(async (req: Request) => {
  const session = await requireSession();
  const { endpoint } = (await req.json().catch(() => ({}))) as { endpoint?: string };
  if (typeof endpoint !== "string" || !endpoint) throw new ApiError(400, "Missing endpoint.");

  await sql`
    DELETE FROM push_subscriptions
    WHERE user_id = ${session.user.id} AND endpoint = ${endpoint}
  `;

  return NextResponse.json({ ok: true });
});
