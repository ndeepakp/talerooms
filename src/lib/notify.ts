import { sql } from "./db";
import { sendPushToUser, pushMessageFor } from "./push";

export type NotificationKind =
  | "purchase"
  | "follow"
  | "subscribe"
  | "reaction"
  | "sub_expiring"
  | "new_chapter"
  | "mention"
  | "story_mention"
  | "post_like"
  | "post_comment"
  | "review"
  | "prompt_answer"
  | "grant_expiring";

// Records a notification for `userId` (the recipient). Skips self-notifications
// (e.g. liking your own post). Never throws into the caller's flow — a
// failed notification must not break the action that triggered it.
export async function notify(opts: {
  userId: string;
  kind: NotificationKind;
  actorId?: string;
  storyId?: string;
  data?: Record<string, string | number | boolean | null>;
}): Promise<void> {
  if (opts.actorId && opts.actorId === opts.userId) return;
  try {
    await sql`
      INSERT INTO notifications (user_id, kind, actor_id, story_id, data)
      VALUES (
        ${opts.userId}, ${opts.kind}, ${opts.actorId ?? null},
        ${opts.storyId ?? null}, ${sql.json(opts.data ?? {})}
      )
    `;
  } catch {
    // Swallow — notifications are best-effort.
  }

  // Also fire a Web Push (best-effort; no-op if the user hasn't subscribed or
  // VAPID isn't configured). Resolve the actor name + story title for the text.
  try {
    const [meta] = await sql<{ actor: string | null; story: string | null }[]>`
      SELECT
        (SELECT name FROM "user" WHERE id = ${opts.actorId ?? null}) AS actor,
        (SELECT title FROM stories WHERE id = ${opts.storyId ?? null}) AS story
    `;
    const payload = pushMessageFor(opts.kind, {
      actor: meta?.actor,
      story: meta?.story,
      storyId: opts.storyId ?? null,
    });
    await sendPushToUser(opts.userId, payload);
  } catch {
    // Swallow — push is best-effort.
  }
}
