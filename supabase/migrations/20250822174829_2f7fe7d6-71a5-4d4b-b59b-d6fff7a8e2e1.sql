-- Add YouTube support to watchlist table
ALTER TABLE public.watchlist 
ADD COLUMN youtube_url TEXT,
ADD COLUMN channel_name TEXT;

-- Update the type column to allow 'youtube' as a value
ALTER TABLE public.watchlist 
DROP CONSTRAINT IF EXISTS watchlist_type_check;

ALTER TABLE public.watchlist 
ADD CONSTRAINT watchlist_type_check 
CHECK (type IN ('movie', 'tv', 'documentary', 'youtube'));