-- Add imdb_id column to search_cache table for fallback IMDB links

ALTER TABLE search_cache ADD COLUMN IF NOT EXISTS imdb_id TEXT;

COMMENT ON COLUMN search_cache.imdb_id IS 'IMDB ID for the identified content (e.g., tt0133093) - used for fallback link when no streaming platforms available';
