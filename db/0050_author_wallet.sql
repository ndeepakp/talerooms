-- Money records survive profile deletion; never reuse an orphaned account.
CREATE TABLE IF NOT EXISTS author_payment_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  mode text NOT NULL CHECK (mode IN ('test', 'live')),
  country text NOT NULL CHECK (country ~ '^[A-Z]{2}$'),
  provider_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, mode), UNIQUE(provider_id, mode)
);
CREATE TABLE IF NOT EXISTS wallet_withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES author_payment_accounts(id),
  request_key uuid NOT NULL,
  amount bigint NOT NULL CHECK (amount > 0 AND amount <= 9007199254740991),
  currency text NOT NULL CHECK (currency ~ '^[a-z]{3}$'),
  source_type text NOT NULL CHECK (source_type IN ('card', 'bank_account', 'fpx')),
  provider_id text,
  status text NOT NULL CHECK (status IN ('reserved', 'unknown', 'pending', 'in_transit', 'paid', 'failed', 'canceled')),
  arrival_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(account_id, request_key), UNIQUE(account_id, provider_id)
);
CREATE INDEX IF NOT EXISTS wallet_withdrawals_account ON wallet_withdrawals(account_id, created_at DESC);
CREATE TABLE IF NOT EXISTS wallet_transactions (
  account_id uuid NOT NULL REFERENCES author_payment_accounts(id),
  provider_id text NOT NULL,
  currency text NOT NULL,
  amount bigint NOT NULL, fee bigint NOT NULL, net bigint NOT NULL,
  kind text NOT NULL, status text NOT NULL,
  occurred_at timestamptz NOT NULL, available_at timestamptz NOT NULL,
  PRIMARY KEY(account_id, provider_id)
);
CREATE TABLE IF NOT EXISTS wallet_webhook_events (
  mode text NOT NULL, event_id text NOT NULL, processed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(mode, event_id)
);
CREATE TABLE IF NOT EXISTS wallet_rate_limits (
  key text PRIMARY KEY,
  window_start timestamptz NOT NULL,
  requests integer NOT NULL
);
