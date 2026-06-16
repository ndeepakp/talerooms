-- Which occurrence of the quoted text the bookmark points at, within the
-- chapter (0-based). Without this, jumping to a bookmark whose text appears more
-- than once always lands on the first occurrence.
ALTER TABLE bookmarks ADD COLUMN IF NOT EXISTS occurrence int NOT NULL DEFAULT 0;
