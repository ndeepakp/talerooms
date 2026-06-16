-- Per-story currency (author picks when pricing). ISO 4217 code; prices are
-- shown with this currency's symbol. No conversion — payments are mock.
ALTER TABLE stories ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'INR';
