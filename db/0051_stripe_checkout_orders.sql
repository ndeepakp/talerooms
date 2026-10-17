-- Provider-backed checkout records. Legacy demo grants remain distinct by a null order reference.
CREATE TABLE IF NOT EXISTS payment_orders (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 buyer_id text REFERENCES "user"(id) ON DELETE SET NULL,
 author_id text REFERENCES "user"(id) ON DELETE SET NULL,
 story_id uuid REFERENCES stories(id) ON DELETE SET NULL,
 request_key uuid NOT NULL,
 request_hash text NOT NULL,
 mode text NOT NULL CHECK (mode IN ('test','live')),
 provider_account_id text NOT NULL,
 story_title text NOT NULL,
 currency text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
 amount_minor bigint NOT NULL CHECK (amount_minor > 0 AND amount_minor <= 9007199254740991),
 platform_fee_bps integer NOT NULL CHECK (platform_fee_bps >= 0 AND platform_fee_bps < 10000),
 items jsonb NOT NULL CHECK (jsonb_typeof(items)='array'),
 status text NOT NULL DEFAULT 'created' CHECK (status IN ('created','checkout_open','paid','expired')),
 checkout_session_id text UNIQUE,
 payment_intent_id text,
 paid_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(buyer_id,request_key,mode)
);
CREATE UNIQUE INDEX IF NOT EXISTS payment_orders_open_basket ON payment_orders(buyer_id,story_id,request_hash,mode) WHERE status IN ('created','checkout_open');
CREATE INDEX IF NOT EXISTS payment_orders_buyer ON payment_orders(buyer_id,created_at DESC);
CREATE TABLE IF NOT EXISTS payment_webhook_events (
 mode text NOT NULL, event_id text NOT NULL, processed_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(mode,event_id)
);
ALTER TABLE access_grants ADD COLUMN IF NOT EXISTS payment_order_id uuid REFERENCES payment_orders(id);
CREATE UNIQUE INDEX IF NOT EXISTS access_grants_payment_item ON access_grants(payment_order_id,scope,COALESCE(chapter_index,-1)) WHERE payment_order_id IS NOT NULL;
