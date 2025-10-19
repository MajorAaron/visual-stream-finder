-- Add favorite column to watchlist to support starring titles
ALTER TABLE public.watchlist
ADD COLUMN IF NOT EXISTS favorite boolean NOT NULL DEFAULT false;

-- Helpful index for querying favorites per user
CREATE INDEX IF NOT EXISTS idx_watchlist_user_favorite ON public.watchlist(user_id, favorite);

-- Ensure updated_at continues to update on changes
CREATE OR REPLACE TRIGGER update_watchlist_updated_at
BEFORE UPDATE ON public.watchlist
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
