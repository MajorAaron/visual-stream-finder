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
}

export class WatchlistService {
  static async addToWatchlist(content: DetectedContent): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Adding to watchlist for user:', user?.id);
      
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
        ...(content.type === 'youtube' && {
          youtube_url: content.youtubeUrl,
          channel_name: content.channelName
        })
      };

      console.log('Inserting watchlist item:', insertData);

      const { data, error } = await supabase
        .from('watchlist')
        .insert(insertData)
        .select();

      console.log('Insert result:', { data, error });

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
      // First check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Current user:', user?.id, user?.email);
      
      if (!user) {
        console.log('No authenticated user found');
        return { data: [], error: 'Not authenticated' };
      }

      const { data, error } = await supabase
        .from('watchlist')
        .select('*')
        .eq('watched', false)
        .order('created_at', { ascending: false });

      console.log('Watchlist query result:', { data, error });

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
}