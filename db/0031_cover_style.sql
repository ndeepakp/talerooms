-- A generated cover style (designed template) for stories without an uploaded
-- image. JSON like {"palette": 3}. Display precedence: cover_url > cover_style >
-- generic placeholder.
ALTER TABLE stories ADD COLUMN IF NOT EXISTS cover_style jsonb;
