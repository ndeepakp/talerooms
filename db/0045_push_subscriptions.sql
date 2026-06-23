-- Web Push subscriptions. Each row is one browser/device a user has opted into
-- push notifications from. A user can have several (phone, laptop, …). The
-- endpoint is the push service URL; p256dh + auth are the subscription's
-- encryption keys. Dropped automatically when the user is deleted, or pruned by
-- the server when the push service reports the subscription is gone (404/410).
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  endpoint   text NOT NULL,
  p256dh     text NOT NULL,
  auth       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON push_subscriptions (user_id);
