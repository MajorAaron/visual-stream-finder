-- Add watched column to watchlist table
ALTER TABLE public.watchlist 
ADD COLUMN watched boolean NOT NULL DEFAULT false;

-- Add index for better performance when filtering by watched status
CREATE INDEX idx_watchlist_user_watched ON public.watchlist(user_id, watched);

-- Update the updated_at trigger to include the new column
CREATE OR REPLACE TRIGGER update_watchlist_updated_at
BEFORE UPDATE ON public.watchlist
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();