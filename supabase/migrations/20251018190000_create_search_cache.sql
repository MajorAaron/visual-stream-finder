-- Create search_cache table for caching AI analysis results
-- This table dramatically reduces API costs by caching search results for 90 days

CREATE TABLE IF NOT EXISTS public.search_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Cache key (SHA256 hash of normalized input)
  input_hash TEXT NOT NULL UNIQUE,

  -- Input metadata
  content_type TEXT NOT NULL CHECK (content_type IN ('image', 'text', 'url')),

  -- Identified content
  identified_title TEXT NOT NULL,
  identified_year INTEGER,
  identified_type TEXT CHECK (identified_type IN ('movie', 'tv', 'documentary', 'youtube')),

  -- External IDs
  tmdb_id INTEGER,
  tmdb_poster_url TEXT,
  youtube_id TEXT,
  youtube_url TEXT,
  channel_name TEXT,

  -- Metadata
  confidence DECIMAL(3,2),
  plot TEXT,
  genre TEXT[] DEFAULT '{}',
  rating DECIMAL(3,1),
  runtime TEXT,
  release_date TEXT,

  -- Cache management
  hit_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_accessed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast cache lookups
CREATE INDEX idx_search_cache_input_hash ON public.search_cache(input_hash);

-- Index for cache cleanup (find old entries)
CREATE INDEX idx_search_cache_created_at ON public.search_cache(created_at);

-- Index for analytics (most popular searches)
CREATE INDEX idx_search_cache_hit_count ON public.search_cache(hit_count DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE public.search_cache ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated and anonymous users to read from cache
-- This is a global cache shared across all users to maximize hit rate
CREATE POLICY "Anyone can read search cache"
ON public.search_cache
FOR SELECT
TO public
USING (true);

-- Only allow the service to insert/update cache entries
-- Frontend will not directly write to cache - only edge functions will
CREATE POLICY "Service can insert cache entries"
ON public.search_cache
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Service can update cache entries"
ON public.search_cache
FOR UPDATE
TO service_role
USING (true);

-- Function to automatically update last_accessed_at and increment hit_count
CREATE OR REPLACE FUNCTION public.update_cache_access()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.last_accessed_at = now();
  NEW.hit_count = OLD.hit_count + 1;
  RETURN NEW;
END;
$$;

-- Trigger to track cache access
CREATE TRIGGER update_cache_access_trigger
BEFORE UPDATE ON public.search_cache
FOR EACH ROW
EXECUTE FUNCTION public.update_cache_access();

-- Function to clean up old cache entries (90 days old)
CREATE OR REPLACE FUNCTION public.cleanup_old_cache_entries()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.search_cache
  WHERE created_at < now() - INTERVAL '90 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Comment on table
COMMENT ON TABLE public.search_cache IS 'Cache for AI-powered search results to reduce API costs and improve performance. Entries are kept for 90 days.';
