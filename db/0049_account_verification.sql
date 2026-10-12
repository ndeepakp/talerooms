-- Existing accounts get one 30-day transition window, without pretending their
-- email is verified. Re-running this migration must not extend the window.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema()
    AND table_name = 'user' AND column_name = 'verificationGraceUntil') THEN
    ALTER TABLE "user" ADD COLUMN "verificationGraceUntil" timestamptz;
    UPDATE "user" SET "verificationGraceUntil" = now() + interval '30 days'
      WHERE "emailVerified" = false;
  END IF;
END $$;

-- Durable per-account OTP throttling; keys are hashes, not email addresses.
CREATE TABLE IF NOT EXISTS auth_verification_limits (
  key text PRIMARY KEY,
  window_start timestamptz NOT NULL DEFAULT now(),
  requests integer NOT NULL DEFAULT 0,
  last_sent_at timestamptz
);
