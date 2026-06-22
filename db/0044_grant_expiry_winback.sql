-- Win-back: when a reader's story/chapter access is about to expire, nudge them
-- to renew (at a discount). expiry_notified prevents repeat nags per grant.
ALTER TABLE access_grants
  ADD COLUMN IF NOT EXISTS expiry_notified boolean NOT NULL DEFAULT false;

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_kind_check;
ALTER TABLE notifications
  ADD CONSTRAINT notifications_kind_check CHECK (kind IN (
    'purchase', 'follow', 'subscribe',
    'reaction', 'sub_expiring', 'new_chapter', 'mention', 'story_mention',
    'post_like', 'post_comment', 'review', 'prompt_answer', 'grant_expiring'
  ));
