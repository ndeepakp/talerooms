-- Current-schema reference seed: slug is required on fresh installs.
-- Seed the fixed set of genres. These are reference data (not user content), so
-- they must exist in every database — including a freshly provisioned one. This
-- was previously only seeded by hand locally, which is why a new production DB
-- came up with an empty genre list. Idempotent: safe to run repeatedly.
INSERT INTO genres (id, name, slug) VALUES
  (1, 'Fantasy', 'fantasy'),
  (2, 'Science Fiction', 'science-fiction'),
  (3, 'Romance', 'romance'),
  (4, 'Mystery', 'mystery'),
  (5, 'Thriller', 'thriller'),
  (6, 'Horror', 'horror'),
  (7, 'Historical', 'historical'),
  (8, 'Literary', 'literary'),
  (9, 'Adventure', 'adventure'),
  (10, 'Young Adult', 'young-adult'),
  (11, 'Poetry', 'poetry'),
  (12, 'Non-fiction', 'non-fiction')
ON CONFLICT (id) DO NOTHING;

-- Keep the id sequence ahead of the seeded rows so future inserts don't collide.
SELECT setval(pg_get_serial_sequence('genres', 'id'), (SELECT max(id) FROM genres));
