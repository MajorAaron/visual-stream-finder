import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StreamingSource {
  name: string;
  logo: string;
  url: string;
  type: 'subscription' | 'rent' | 'buy' | 'free';
  price?: string;
}

interface ContentResult {
  title: string;
  year: number;
  type: 'movie' | 'tv' | 'documentary';
  genre: string[];
  rating: number;
  runtime?: string;
  plot: string;
  poster: string;
  streamingSources: StreamingSource[];
  confidence: number;
  releaseDate?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();
    
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Query parameter is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Searching for:', query);

    const results = await searchContent(query.trim());
    
    return new Response(
      JSON.stringify({ results }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error in search-content function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function searchContent(query: string): Promise<ContentResult[]> {
  const tmdbApiKey = Deno.env.get('TMDB_API_KEY');
  const streamingApiKey = Deno.env.get('STREAMING_AVAILABILITY_API_KEY');
  
  if (!tmdbApiKey) {
    throw new Error('TMDB API key not configured');
  }

  const results: ContentResult[] = [];

  try {
    // Search movies
    const movieResponse = await fetch(
      `https://api.themoviedb.org/3/search/movie?api_key=${tmdbApiKey}&query=${encodeURIComponent(query)}&page=1`
    );
    
    if (movieResponse.ok) {
      const movieData = await movieResponse.json();
      console.log('TMDB movie results:', movieData.results?.length || 0);
      
      if (movieData.results && movieData.results.length > 0) {
        for (const movie of movieData.results.slice(0, 3)) { // Limit to top 3 results
          const streamingSources = await getStreamingSources(movie.title, movie.release_date?.split('-')[0] || '', 'movie', streamingApiKey);
          
          results.push({
            title: movie.title,
            year: parseInt(movie.release_date?.split('-')[0] || '0'),
            type: 'movie',
            genre: await getGenreNames(movie.genre_ids, 'movie', tmdbApiKey),
            rating: movie.vote_average || 0,
            plot: movie.overview || 'No plot available',
            poster: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : '',
            streamingSources,
            confidence: movie.vote_count > 100 ? 0.9 : 0.7,
            releaseDate: movie.release_date
          });
        }
      }
    }

    // Search TV shows
    const tvResponse = await fetch(
      `https://api.themoviedb.org/3/search/tv?api_key=${tmdbApiKey}&query=${encodeURIComponent(query)}&page=1`
    );
    
    if (tvResponse.ok) {
      const tvData = await tvResponse.json();
      console.log('TMDB TV results:', tvData.results?.length || 0);
      
      if (tvData.results && tvData.results.length > 0) {
        for (const show of tvData.results.slice(0, 3)) { // Limit to top 3 results
          const streamingSources = await getStreamingSources(show.name, show.first_air_date?.split('-')[0] || '', 'tv', streamingApiKey);
          
          results.push({
            title: show.name,
            year: parseInt(show.first_air_date?.split('-')[0] || '0'),
            type: 'tv',
            genre: await getGenreNames(show.genre_ids, 'tv', tmdbApiKey),
            rating: show.vote_average || 0,
            plot: show.overview || 'No plot available',
            poster: show.poster_path ? `https://image.tmdb.org/t/p/w500${show.poster_path}` : '',
            streamingSources,
            confidence: show.vote_count > 100 ? 0.9 : 0.7,
            releaseDate: show.first_air_date
          });
        }
      }
    }

    // Sort by popularity/rating and remove duplicates
    const uniqueResults = results.filter((result, index, self) => 
      index === self.findIndex(r => r.title.toLowerCase() === result.title.toLowerCase() && r.year === result.year)
    );
    
    return uniqueResults.sort((a, b) => b.rating - a.rating).slice(0, 5);
    
  } catch (error) {
    console.error('Error searching content:', error);
    throw error;
  }
}

async function getGenreNames(genreIds: number[], mediaType: 'movie' | 'tv', apiKey: string): Promise<string[]> {
  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/genre/${mediaType}/list?api_key=${apiKey}`
    );
    
    if (response.ok) {
      const data = await response.json();
      const genreMap = new Map(data.genres.map((g: any) => [g.id, g.name]));
      return genreIds.map(id => genreMap.get(id)).filter(Boolean);
    }
  } catch (error) {
    console.error('Error fetching genres:', error);
  }
  
  return [];
}

async function getStreamingSources(title: string, year: string, type: string, streamingApiKey?: string): Promise<StreamingSource[]> {
  // Mock streaming sources for now - in production this would use the Streaming Availability API
  const mockSources: StreamingSource[] = [
    {
      name: "Netflix",
      logo: "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=40&h=40&fit=crop",
      url: "https://netflix.com",
      type: "subscription"
    },
    {
      name: "Amazon Prime Video",
      logo: "https://images.unsplash.com/photo-1523474253046-8cd2748b5fd2?w=40&h=40&fit=crop",
      url: "https://primevideo.com",
      type: "rent",
      price: "$3.99"
    },
    {
      name: "Apple TV+",
      logo: "https://images.unsplash.com/photo-1611605698335-8b1569810432?w=40&h=40&fit=crop",
      url: "https://tv.apple.com",
      type: "buy",
      price: "$12.99"
    }
  ];

  // Randomly return 1-3 sources to simulate real data
  const numSources = Math.floor(Math.random() * 3) + 1;
  return mockSources.slice(0, numSources);
}