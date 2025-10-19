import { useState, useEffect, useRef } from 'react';
import { WatchlistService, WatchlistItem } from '@/utils/watchlistService';
import { DetectedContent } from '@/utils/aiAnalysis';

export const useWatchlist = () => {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [favorites, setFavorites] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const hasFetchedRef = useRef(false);

  // Only fetch once on mount
  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    
    const fetchData = async () => {
      try {
        const [watchlistRes, favoritesRes] = await Promise.all([
          WatchlistService.getWatchlist(),
          WatchlistService.getFavorites(),
        ]);
        if (!watchlistRes.error && watchlistRes.data) setWatchlist(watchlistRes.data);
        if (!favoritesRes.error && favoritesRes.data) setFavorites(favoritesRes.data);
      } catch (err) {
        console.error('Error fetching watchlist:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []); // Empty dependency array - only run once

  const addToWatchlist = async (content: DetectedContent) => {
    const { success, error } = await WatchlistService.addToWatchlist(content);
    if (success) {
      console.log(`${content.title} has been saved to your watchlist.`);
      // Manually refresh
      const [watchlistRes, favoritesRes] = await Promise.all([
        WatchlistService.getWatchlist(),
        WatchlistService.getFavorites(),
      ]);
      if (watchlistRes.data) setWatchlist(watchlistRes.data);
      if (favoritesRes.data) setFavorites(favoritesRes.data);
    } else {
      console.error('Failed to add to watchlist:', error);
    }
  };

  const removeFromWatchlist = async (title: string, year: number) => {
    const { success, error } = await WatchlistService.removeFromWatchlist(title, year);
    if (success) {
      console.log(`${title} has been removed from your watchlist.`);
      // Manually refresh
      const [watchlistRes, favoritesRes] = await Promise.all([
        WatchlistService.getWatchlist(),
        WatchlistService.getFavorites(),
      ]);
      if (watchlistRes.data) setWatchlist(watchlistRes.data);
      if (favoritesRes.data) setFavorites(favoritesRes.data);
    } else {
      console.error('Failed to remove from watchlist:', error);
    }
  };

  const markAsWatched = async (title: string, year: number) => {
    const { success, error } = await WatchlistService.markAsWatched(title, year);
    if (success) {
      console.log(`${title} has been marked as watched.`);
      // Manually refresh
      const [watchlistRes, favoritesRes] = await Promise.all([
        WatchlistService.getWatchlist(),
        WatchlistService.getFavorites(),
      ]);
      if (watchlistRes.data) setWatchlist(watchlistRes.data);
      if (favoritesRes.data) setFavorites(favoritesRes.data);
    } else {
      console.error('Failed to mark as watched:', error);
    }
  };

  const isInWatchlist = async (title: string, year: number): Promise<boolean> => {
    return await WatchlistService.isInWatchlist(title, year);
  };

  const setFavorite = async (title: string, year: number, favorite: boolean) => {
    const { success, error } = await WatchlistService.setFavorite(title, year, favorite);
    if (success) {
      const [watchlistRes, favoritesRes] = await Promise.all([
        WatchlistService.getWatchlist(),
        WatchlistService.getFavorites(),
      ]);
      if (watchlistRes.data) setWatchlist(watchlistRes.data);
      if (favoritesRes.data) setFavorites(favoritesRes.data);
    } else {
      console.error('Failed to update favorite:', error);
    }
  };

  return {
    watchlist,
    favorites,
    loading,
    addToWatchlist,
    removeFromWatchlist,
    markAsWatched,
    isInWatchlist,
    setFavorite,
    refreshWatchlist: async () => {
      const [watchlistRes, favoritesRes] = await Promise.all([
        WatchlistService.getWatchlist(),
        WatchlistService.getFavorites(),
      ]);
      if (watchlistRes.data) setWatchlist(watchlistRes.data);
      if (favoritesRes.data) setFavorites(favoritesRes.data);
    },
  };
};

export const useWatchedItems = () => {
  const [watchedItems, setWatchedItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const hasFetchedRef = useRef(false);

  // Only fetch once on mount
  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    
    const fetchData = async () => {
      try {
        const { data, error } = await WatchlistService.getWatchedItems();
        if (!error && data) {
          setWatchedItems(data);
        }
      } catch (err) {
        console.error('Error fetching watched items:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []); // Empty dependency array - only run once

  const markAsUnwatched = async (title: string, year: number) => {
    const { success, error } = await WatchlistService.markAsUnwatched(title, year);
    if (success) {
      console.log(`${title} has been moved back to your watchlist.`);
      // Manually refresh
      const { data } = await WatchlistService.getWatchedItems();
      if (data) setWatchedItems(data);
    } else {
      console.error('Failed to mark as unwatched:', error);
    }
  };

  const removeFromWatchlist = async (title: string, year: number) => {
    const { success, error } = await WatchlistService.removeFromWatchlist(title, year);
    if (success) {
      console.log(`${title} has been permanently removed.`);
      // Manually refresh
      const { data } = await WatchlistService.getWatchedItems();
      if (data) setWatchedItems(data);
    } else {
      console.error('Failed to remove from watchlist:', error);
    }
  };

  return {
    watchedItems,
    loading,
    markAsUnwatched,
    removeFromWatchlist,
    refreshWatchedItems: async () => {
      const { data } = await WatchlistService.getWatchedItems();
      if (data) setWatchedItems(data);
    },
  };
};