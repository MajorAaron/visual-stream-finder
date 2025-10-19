import { supabase } from '@/integrations/supabase/client';
import { DetectedContent } from './aiAnalysis';

export interface WatchlistItem {
  id: string;
  user_id: string;
  title: string;
  year: number;
  type: 'movie' | 'tv' | 'documentary' | 'youtube';
  genre: string[];
  rating?: number;
  runtime?: string;
  plot?: string;
  poster?: string;
  streaming_sources: any[];
  confidence?: number;
  created_at: string;
  updated_at: string;
  youtube_url?: string;
  channel_name?: string;
  watched: boolean;
  favorite: boolean;
}

export class WatchlistService {
  static async addToWatchlist(content: DetectedContent): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('No authenticated user');
        return { success: false, error: 'You must be logged in to add to watchlist' };
      }

      const insertData = {
        title: content.title,
        year: content.year,
        type: content.type,
        genre: content.genre,
        rating: content.rating,
        runtime: content.runtime,
        plot: content.plot,
        poster: content.poster,
        streaming_sources: content.streamingSources as any,
        confidence: content.confidence,
        user_id: user.id,
        watched: false,
        favorite: false,
        // Persist YouTube preview info when available (for all types)
        youtube_url: content.youtubeUrl || null,
        channel_name: content.channelName || null
      };

      const { data, error } = await supabase
        .from('watchlist')
        .insert(insertData)
        .select();

      if (error) {
        console.error('Error adding to watchlist:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error adding to watchlist:', error);
      return { success: false, error: 'Failed to add to watchlist' };
    }
  }

  static async removeFromWatchlist(title: string, year: number): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('watchlist')
        .delete()
        .eq('title', title)
        .eq('year', year);

      if (error) {
        console.error('Error removing from watchlist:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error removing from watchlist:', error);
      return { success: false, error: 'Failed to remove from watchlist' };
    }
  }

  static async getWatchlist(): Promise<{ data: WatchlistItem[]; error?: string }> {
    try {
      // Use RLS instead of checking auth manually - the database will handle auth
      const { data, error } = await supabase
        .from('watchlist')
        .select('*')
        .eq('watched', false)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching watchlist:', error);
        return { data: [], error: error.message };
      }

      return { data: (data || []) as WatchlistItem[] };
    } catch (error) {
      console.error('Error fetching watchlist:', error);
      return { data: [], error: 'Failed to fetch watchlist' };
    }
  }

  static async getWatchedItems(): Promise<{ data: WatchlistItem[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('watchlist')
        .select('*')
        .eq('watched', true)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching watched items:', error);
        return { data: [], error: error.message };
      }

      return { data: (data || []) as WatchlistItem[] };
    } catch (error) {
      console.error('Error fetching watched items:', error);
      return { data: [], error: 'Failed to fetch watched items' };
    }
  }

  static async getFavorites(): Promise<{ data: WatchlistItem[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('watchlist')
        .select('*')
        .eq('favorite', true)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching favorites:', error);
        return { data: [], error: error.message };
      }

      return { data: (data || []) as WatchlistItem[] };
    } catch (error) {
      console.error('Error fetching favorites:', error);
      return { data: [], error: 'Failed to fetch favorites' };
    }
  }

  static async markAsWatched(title: string, year: number): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('watchlist')
        .update({ watched: true })
        .eq('title', title)
        .eq('year', year);

      if (error) {
        console.error('Error marking as watched:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error marking as watched:', error);
      return { success: false, error: 'Failed to mark as watched' };
    }
  }

  static async markAsUnwatched(title: string, year: number): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('watchlist')
        .update({ watched: false })
        .eq('title', title)
        .eq('year', year);

      if (error) {
        console.error('Error marking as unwatched:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error marking as unwatched:', error);
      return { success: false, error: 'Failed to mark as unwatched' };
    }
  }

  static async isInWatchlist(title: string, year: number): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('watchlist')
        .select('id')
        .eq('title', title)
        .eq('year', year)
        .maybeSingle();

      if (error) {
        console.error('Error checking watchlist:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Error checking watchlist:', error);
      return false;
    }
  }

  static async isFavorite(title: string, year: number): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('watchlist')
        .select('favorite')
        .eq('title', title)
        .eq('year', year)
        .maybeSingle();

      if (error) {
        console.error('Error checking favorite:', error);
        return false;
      }

      return !!data && !!(data as any).favorite;
    } catch (error) {
      console.error('Error checking favorite:', error);
      return false;
    }
  }

  static async setFavorite(title: string, year: number, favorite: boolean): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('watchlist')
        .update({ favorite })
        .eq('title', title)
        .eq('year', year);

      if (error) {
        console.error('Error updating favorite:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating favorite:', error);
      return { success: false, error: 'Failed to update favorite' };
    }
  }

  static async getItemStatus(title: string, year: number): Promise<{ exists: boolean; favorite: boolean; watched: boolean }> {
    try {
      const { data, error } = await supabase
        .from('watchlist')
        .select('id, favorite, watched')
        .eq('title', title)
        .eq('year', year)
        .maybeSingle();

      if (error || !data) {
        return { exists: false, favorite: false, watched: false };
      }
      return { exists: true, favorite: !!(data as any).favorite, watched: !!(data as any).watched };
    } catch (error) {
      console.error('Error fetching item status:', error);
      return { exists: false, favorite: false, watched: false };
    }
  }
}