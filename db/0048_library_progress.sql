-- Completion is reader-declared, never inferred from opening the last chapter.
ALTER TABLE reading_progress ADD COLUMN IF NOT EXISTS completed_chapter_count integer;
-- Page count describes the bookmarked chapter, not the whole story.
-- NULL preserves older bookmarks whose pagination count was not recorded.
ALTER TABLE reading_progress ADD COLUMN IF NOT EXISTS page_count integer;
