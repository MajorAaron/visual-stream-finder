import { useState, useEffect } from 'react';
import { WatchlistService, WatchlistItem } from '@/utils/watchlistService';
import { DetectedContent } from '@/utils/aiAnalysis';
import { useToast } from '@/components/ui/use-toast';

export const useWatchlist = () => {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchWatchlist = async () => {
    setLoading(true);
    const { data, error } = await WatchlistService.getWatchlist();
    if (error) {
      toast({
        title: "Error",
        description: error,
        variant: "destructive",
      });
    } else {
      setWatchlist(data);
    }
    setLoading(false);
  };

  const addToWatchlist = async (content: DetectedContent) => {
    const { success, error } = await WatchlistService.addToWatchlist(content);
    if (success) {
      toast({
        title: "Added to Watchlist",
        description: `${content.title} has been saved to your watchlist.`,
      });
      await fetchWatchlist(); // Refresh the watchlist
    } else {
      toast({
        title: "Error",
        description: error || "Failed to add to watchlist",
        variant: "destructive",
      });
    }
  };

  const removeFromWatchlist = async (title: string, year: number) => {
    const { success, error } = await WatchlistService.removeFromWatchlist(title, year);
    if (success) {
      toast({
        title: "Removed from Watchlist",
        description: `${title} has been removed from your watchlist.`,
      });
      await fetchWatchlist(); // Refresh the watchlist
    } else {
      toast({
        title: "Error",
        description: error || "Failed to remove from watchlist",
        variant: "destructive",
      });
    }
  };

  const isInWatchlist = async (title: string, year: number): Promise<boolean> => {
    return await WatchlistService.isInWatchlist(title, year);
  };

  useEffect(() => {
    fetchWatchlist();
  }, []);

  return {
    watchlist,
    loading,
    addToWatchlist,
    removeFromWatchlist,
    isInWatchlist,
    refreshWatchlist: fetchWatchlist,
  };
};