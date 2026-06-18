-- Retire the 'comment' notification kind. Per-story comments were removed
-- (see 0040_drop_story_comments.sql), so nothing emits this kind anymore.
-- Delete any leftover rows first, then tighten the CHECK constraint so the
-- kind can no longer be written.
DELETE FROM notifications WHERE kind = 'comment';

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_kind_check;
ALTER TABLE notifications
  ADD CONSTRAINT notifications_kind_check CHECK (kind IN (
    'purchase', 'follow', 'subscribe',
    'reaction', 'sub_expiring', 'new_chapter', 'mention', 'story_mention',
    'post_like', 'post_comment', 'review'
  ));
