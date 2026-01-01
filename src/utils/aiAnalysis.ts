// Real AI analysis service using OpenAI Vision API via Supabase Edge Function
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export interface DetectedContent {
  title: string;
  year: number;
  type: 'movie' | 'tv' | 'documentary' | 'youtube';
  genre: string[];
  rating: number;
  runtime?: string;
  plot: string;
  poster: string;
  streamingSources: StreamingSource[];
  confidence: number;
  releaseDate?: string;
  youtubeUrl?: string;
  channelName?: string;
}

interface StreamingSource {
  name: string;
  logo: string;
  url: string;
  type: 'subscription' | 'rent' | 'buy' | 'free';
  price?: string;
}

// Mock data for demonstration
const mockResults: DetectedContent[] = [
  {
    title: "The Matrix",
    year: 1999,
    type: "movie",
    genre: ["Action", "Sci-Fi"],
    rating: 8.7,
    runtime: "2h 16m",
    plot: "A computer programmer discovers that reality as he knows it is actually a simulation, and he must choose between the comfortable lie and the difficult truth.",
    poster: "https://images.unsplash.com/photo-1489599904821-6ef46474ebc3?w=300&h=450&fit=crop",
    confidence: 0.92,
    streamingSources: [
      {
        name: "Netflix",
        logo: "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=40&h=40&fit=crop",
        url: "https://netflix.com",
        type: "subscription"
      },
      {
        name: "Amazon Prime",
        logo: "https://images.unsplash.com/photo-1523474253046-8cd2748b5fd2?w=40&h=40&fit=crop",
        url: "https://primevideo.com",
        type: "rent",
        price: "$3.99"
      },
      {
        name: "Apple TV",
        logo: "https://images.unsplash.com/photo-1611605698335-8b1569810432?w=40&h=40&fit=crop",
        url: "https://tv.apple.com",
        type: "buy",
        price: "$12.99"
      }
    ]
  },
  {
    title: "Stranger Things",
    year: 2016,
    type: "tv",
    genre: ["Sci-Fi", "Horror", "Drama"],
    rating: 8.8,
    plot: "In 1980s Indiana, a group of young friends witness supernatural forces and secret government exploits as they search for their missing friend.",
    poster: "https://images.unsplash.com/photo-1560169897-fc0cdbdfa4d5?w=300&h=450&fit=crop",
    confidence: 0.88,
    streamingSources: [
      {
        name: "Netflix",
        logo: "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=40&h=40&fit=crop",
        url: "https://netflix.com",
        type: "subscription"
      }
    ]
  }
];

export class AIAnalysisService {
  /**
   * NEW: Unified search method using the optimized unified-search edge function
   * This method handles both image and text searches with intelligent caching and cost optimization
   */
  static async unifiedSearch(input: File | string): Promise<DetectedContent[]> {
    try {
      let body: any;

      if (input instanceof File) {
        // Handle image upload
        const { base64, mimeType } = await new Promise<{ base64: string; mimeType: string }>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            const [dataPrefix, base64String] = result.split(',');
            const mimeType = dataPrefix.match(/:(.*?);/)?.[1] || 'image/jpeg';
            resolve({ base64: base64String, mimeType });
          };
          reader.onerror = reject;
          reader.readAsDataURL(input);
        });

        body = { imageBase64: base64, mimeType };
      } else {
        // Handle text search
        body = { query: input };
      }

      // Call the new unified-search edge function
      const { data, error } = await supabase.functions.invoke('unified-search', {
        body
      });

      if (error) {
        console.error('Unified search error:', error);
        toast.error('Search failed. Please try again.');
        throw error;
      }

      if (data.error) {
        console.error('Search error:', data.error);
        toast.error('Search failed. Please try again.');
        throw new Error(data.error);
      }

      return data.results || [];
    } catch (error) {
      console.error('Unified search failed:', error);
      toast.error('Search failed. Please try again.');
      throw error;
    }
  }

  /**
   * LEGACY: Image analysis - now uses unified search internally
   * Kept for backward compatibility
   */
  static async analyzeImage(file: File): Promise<DetectedContent[]> {
    return AIAnalysisService.unifiedSearch(file);
  }

  /**
   * LEGACY: Text search - now uses unified search internally
   * Kept for backward compatibility
   */
  static async searchByText(query: string): Promise<DetectedContent[]> {
    return AIAnalysisService.unifiedSearch(query);
  }

  static async getStreamingSources(title: string, year: number): Promise<StreamingSource[]> {
    // Mock streaming source lookup
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // In production, this would query streaming APIs like:
    // - JustWatch API
    // - Streaming Availability API
    // - Custom scraping services
    
    return mockResults[0].streamingSources;
  }
}