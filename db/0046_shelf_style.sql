-- Per-user Library bookshelf finish (walnut | oak | ebony | minimal). Joins the
-- other account-synced appearance prefs (theme_mode, accent_color, …).
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS shelf_style text NOT NULL DEFAULT 'walnut';
