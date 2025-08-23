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

    // Check if the query is a URL
    const isUrl = query.trim().match(/^https?:\/\/.+/);
    let results;
    
    if (isUrl) {
      results = await searchByUrl(query.trim());
    } else {
      results = await searchContent(query.trim());
    }
    
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

async function searchByUrl(url: string): Promise<ContentResult[]> {
  console.log('Extracting content from URL:', url);
  
  try {
    // Fetch the webpage content
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }
    
    const html = await response.text();
    
    // Extract title and other info from HTML
    let title = '';
    let year = 0;
    let type: 'movie' | 'tv' | 'documentary' = 'movie';
    
    // IMDb specific extraction
    if (url.includes('imdb.com')) {
      // Extract title from meta tags or title tag
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleMatch) {
        title = titleMatch[1];
        console.log('Raw title extracted:', title);
        
        // Clean up IMDb title format (remove " - IMDb" suffix)
        title = title.replace(/\s*-\s*IMDb\s*$/i, '');
        
        // Extract year from title if present - handle various formats
        const yearMatch = title.match(/\((\d{4})(?:-\s*)?\)/);
        if (yearMatch) {
          year = parseInt(yearMatch[1]);
          // Remove the year parentheses from title
          title = title.replace(/\s*\(\d{4}(?:-\s*)?\)/, '').trim();
        }
        
        // Remove common suffixes that interfere with search
        title = title.replace(/\s*\|\s*.+$/, ''); // Remove "| Netflix" etc
        title = title.replace(/\s*-\s*watch\s+.+$/i, ''); // Remove "- Watch online"
        title = title.replace(/\s*\(TV\s+Series.*?\)$/i, ''); // Remove "(TV Series...)"
        title = title.replace(/\s*\(.*?\d{4}.*?\)$/i, ''); // Remove any remaining year info
        title = title.trim();
        
        console.log('Cleaned title:', title, 'Year:', year);
      }
      
      // Check if it's a TV series
      if (html.includes('"@type":"TVSeries"') || url.includes('/title/') && html.includes('TV Series')) {
        type = 'tv';
      }
    }
    
    // If we couldn't extract a title, try to get it from other meta tags
    if (!title) {
      const ogTitleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i);
      if (ogTitleMatch) {
        title = ogTitleMatch[1];
        // Clean this title too
        title = title.replace(/\s*\|\s*.+$/, ''); // Remove "| Netflix" etc
        title = title.replace(/\s*-\s*watch\s+.+$/i, ''); // Remove "- Watch online"
        title = title.trim();
      }
    }
    
    console.log('Extracted title:', title, 'year:', year, 'type:', type);
    
    if (!title) {
      throw new Error('Could not extract title from URL');
    }
    
    // Now search for the extracted title
    return await searchContent(title);
    
  } catch (error) {
    console.error('Error extracting content from URL:', error);
    throw error;
  }
}

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
    
    return uniqueResults.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
    
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
  // Mock streaming sources with proper logos - in production this would use the Streaming Availability API
  const mockSources: StreamingSource[] = [
    {
      name: "Netflix",
      logo: "https://logos-world.net/wp-content/uploads/2020/04/Netflix-Logo.png",
      url: "https://netflix.com",
      type: "subscription"
    },
    {
      name: "Amazon Prime Video",
      logo: "https://logos-world.net/wp-content/uploads/2021/08/Amazon-Prime-Video-Logo.png",
      url: "https://primevideo.com",
      type: "rent",
      price: "$3.99"
    },
    {
      name: "Apple TV+",
      logo: "https://logos-world.net/wp-content/uploads/2021/08/Apple-TV-Logo.png",
      url: "https://tv.apple.com",
      type: "buy",
      price: "$12.99"
    },
    {
      name: "Hulu",
      logo: "https://logos-world.net/wp-content/uploads/2020/06/Hulu-Logo.png",
      url: "https://hulu.com",
      type: "subscription"
    },
    {
      name: "Disney+",
      logo: "https://logos-world.net/wp-content/uploads/2020/11/Disney-Plus-Logo.png",
      url: "https://disneyplus.com",
      type: "subscription"
    }
  ];

  // Randomly return 1-3 sources to simulate real data
  const numSources = Math.floor(Math.random() * 3) + 1;
  return mockSources.slice(0, numSources);
}