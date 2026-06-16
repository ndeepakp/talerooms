-- Seed the fixed set of genres. These are reference data (not user content), so
-- they must exist in every database — including a freshly provisioned one. This
-- was previously only seeded by hand locally, which is why a new production DB
-- came up with an empty genre list. Idempotent: safe to run repeatedly.
INSERT INTO genres (id, name) VALUES
  (1,  'Fantasy'),
  (2,  'Science Fiction'),
  (3,  'Romance'),
  (4,  'Mystery'),
  (5,  'Thriller'),
  (6,  'Horror'),
  (7,  'Historical'),
  (8,  'Literary'),
  (9,  'Adventure'),
  (10, 'Young Adult'),
  (11, 'Poetry'),
  (12, 'Non-fiction')
ON CONFLICT (id) DO NOTHING;

-- Keep the id sequence ahead of the seeded rows so future inserts don't collide.
SELECT setval(pg_get_serial_sequence('genres', 'id'), (SELECT max(id) FROM genres));
