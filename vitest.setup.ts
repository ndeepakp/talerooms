// Some lib modules (e.g. handles.ts) transitively import db.ts, which reads
// DATABASE_URL at module load. The postgres client is lazy and never connects
// during unit tests, but we set a dummy value so the import is always safe.
process.env.DATABASE_URL ??= "postgresql://test@localhost:5432/test";
