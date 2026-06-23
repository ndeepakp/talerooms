import webpush from "web-push";
import { sql } from "./db";
import type { NotificationKind } from "./notify";

// Web Push sender. Configured lazily from the VAPID env vars; if they're missing
// (e.g. a dev box without keys), push is silently skipped so nothing breaks.
const PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const PRIVATE = process.env.VAPID_PRIVATE_KEY;
const SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:hello@talerooms.app";

let ready: boolean | null = null;
function configured(): boolean {
  if (ready !== null) return ready;
  if (PUBLIC && PRIVATE) {
    webpush.setVapidDetails(SUBJECT, PUBLIC, PRIVATE);
    ready = true;
  } else {
    ready = false;
  }
  return ready;
}

export type PushPayload = { title: string; body: string; url: string; tag?: string };

// Sends a push to every device `userId` has subscribed. Dead subscriptions
// (the push service replies 404/410) are pruned. Best-effort — never throws.
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  if (!configured()) return;
  let subs: { id: string; endpoint: string; p256dh: string; auth: string }[] = [];
  try {
    subs = await sql<{ id: string; endpoint: string; p256dh: string; auth: string }[]>`
      SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ${userId}
    `;
  } catch {
    return;
  }
  const body = JSON.stringify(payload);
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body,
        );
      } catch (err) {
        const code = (err as { statusCode?: number })?.statusCode;
        if (code === 404 || code === 410) {
          await sql`DELETE FROM push_subscriptions WHERE id = ${s.id}`.catch(() => {});
        }
      }
    }),
  );
}

// Builds the notification text + deep-link for a push, from the notification's
// kind and the resolved actor name / story title.
export function pushMessageFor(
  kind: NotificationKind,
  ctx: { actor?: string | null; story?: string | null; storyId?: string | null },
): PushPayload {
  const actor = ctx.actor ?? "Someone";
  const story = ctx.story ?? "a story";
  const storyUrl = ctx.storyId ? `/stories/${ctx.storyId}` : "/feed";

  switch (kind) {
    case "new_chapter":
      return { title: "New chapter 📖", body: `${actor} added a new chapter to “${story}”`, url: storyUrl, tag: `chapter-${ctx.storyId ?? ""}` };
    case "follow":
      return { title: "New follower", body: `${actor} started following you`, url: "/feed" };
    case "subscribe":
      return { title: "New subscriber", body: `${actor} subscribed to you`, url: "/feed" };
    case "purchase":
      return { title: "New sale 🎉", body: `${actor} bought access to “${story}”`, url: storyUrl };
    case "reaction":
      return { title: "New reaction", body: `${actor} reacted to “${story}”`, url: storyUrl };
    case "review":
      return { title: "New review", body: `${actor} reviewed “${story}”`, url: storyUrl };
    case "post_like":
      return { title: "New like", body: `${actor} liked your post`, url: "/feed" };
    case "post_comment":
      return { title: "New comment", body: `${actor} commented on your post`, url: "/feed" };
    case "mention":
      return { title: "You were mentioned", body: `${actor} mentioned you`, url: "/feed" };
    case "story_mention":
      return { title: "Your story was mentioned", body: `${actor} mentioned “${story}”`, url: storyUrl };
    case "prompt_answer":
      return { title: "New answer", body: `${actor} answered a prompt on “${story}”`, url: storyUrl };
    case "sub_expiring":
      return { title: "Subscription ending soon", body: `Your subscription to ${actor} is ending soon`, url: "/feed" };
    case "grant_expiring":
      return { title: "Access ending soon", body: `Your access to “${story}” ends soon — renew and save`, url: storyUrl };
    default:
      return { title: "Talerooms", body: "You have a new notification", url: "/feed" };
  }
}
