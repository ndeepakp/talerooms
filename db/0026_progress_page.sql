-- Track the reader's current page within their last-opened chapter, so we can
-- resume them on the exact page automatically (auto page bookmark), not just at
-- the chapter start. One row per (reader, story) as before.
ALTER TABLE reading_progress ADD COLUMN IF NOT EXISTS page_index int NOT NULL DEFAULT 0;
