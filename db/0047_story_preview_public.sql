-- Author opt-in: show the first chapter to logged-out visitors on the public
-- story page (a free "hook" that also gives search engines real content to
-- index). Off by default so existing paid stories don't give away chapter 1.
ALTER TABLE stories ADD COLUMN IF NOT EXISTS preview_public boolean NOT NULL DEFAULT false;
