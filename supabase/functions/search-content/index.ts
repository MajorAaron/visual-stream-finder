import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getStreamingServiceIcon } from "../streaming-icons.ts";

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
    let sourceService = null;
    
    if (isUrl) {
      // Extract the streaming service from the URL
      sourceService = getStreamingServiceFromUrl(query.trim());
      results = await searchByUrl(query.trim());
    } else {
      results = await searchContent(query.trim());
    }
    
    // Add the source service to results if it was detected from a URL
    if (sourceService && results.length > 0) {
      results = results.map(result => ({
        ...result,
        streamingSources: addSourceServiceToResults(result.streamingSources, sourceService)
      }));
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

function getStreamingServiceFromUrl(url: string): StreamingSource | null {
  let serviceId = '';
  let serviceUrl = '';
  
  if (url.includes('hbomax.com') || url.includes('max.com')) {
    serviceId = 'max';
    serviceUrl = 'https://max.com';
  } else if (url.includes('netflix.com')) {
    serviceId = 'netflix';
    serviceUrl = 'https://netflix.com';
  } else if (url.includes('peacocktv.com')) {
    serviceId = 'peacock';
    serviceUrl = 'https://peacocktv.com';
  } else if (url.includes('hulu.com')) {
    serviceId = 'hulu';
    serviceUrl = 'https://hulu.com';
  } else if (url.includes('primevideo.com') || url.includes('amazon.com')) {
    serviceId = 'prime';
    serviceUrl = 'https://primevideo.com';
  } else if (url.includes('disneyplus.com')) {
    serviceId = 'disney';
    serviceUrl = 'https://disneyplus.com';
  } else {
    return null;
  }
  
  const icon = getStreamingServiceIcon(serviceId);
  return {
    name: icon.name,
    logo: icon.logo,
    url: serviceUrl,
    type: 'subscription'
  };
}

function addSourceServiceToResults(existingSources: StreamingSource[], sourceService: StreamingSource): StreamingSource[] {
  // Check if the source service is already in the list
  const serviceExists = existingSources.some(source => 
    source.name.toLowerCase() === sourceService.name.toLowerCase()
  );
  
  if (!serviceExists) {
    // Add the source service as the first item
    return [sourceService, ...existingSources];
  }
  
  return existingSources;
}

async function searchByUrl(url: string): Promise<ContentResult[]> {
  console.log('Extracting content from URL:', url);
  
  try {
    // First, try the AI-powered approach with Firecrawl
    const intelligentResult = await extractWithAI(url);
    if (intelligentResult) {
      return intelligentResult;
    }
    
    // Fallback to traditional HTML parsing
    console.log('Falling back to HTML parsing...');
    return await extractWithHTMLParsing(url);
    
  } catch (error) {
    console.error('Error extracting content from URL:', error);
    // Return empty results instead of throwing to prevent app crashes
    return [];
  }
}

async function extractWithAI(url: string): Promise<ContentResult[] | null> {
  const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!firecrawlApiKey || !openaiApiKey) {
    console.log('Firecrawl or OpenAI API key not available, skipping AI extraction');
    return null;
  }
  
  try {
    console.log('Using Firecrawl to extract page content...');
    
    // Use Firecrawl v1 API to get clean page content
    const firecrawlResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: url,
        formats: ['markdown', 'html'],
        onlyMainContent: true,
        timeout: 30000
      }),
    });
    
    console.log('Firecrawl response status:', firecrawlResponse.status);
    
    if (!firecrawlResponse.ok) {
      const errorText = await firecrawlResponse.text();
      console.log('Firecrawl error response:', errorText);
      return null;
    }
    
    const firecrawlData = await firecrawlResponse.json();
    console.log('Firecrawl data keys:', Object.keys(firecrawlData));
    
    const pageContent = firecrawlData.data?.markdown || firecrawlData.data?.html || '';
    
    if (!pageContent) {
      console.log('No content extracted from Firecrawl');
      return null;
    }
    
    console.log('Using OpenAI to analyze content and extract movie/show info...');
    
    // Use OpenAI to intelligently extract movie/show information
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert at extracting movie and TV show information from web page content. 
            
            Analyze the provided content and extract:
            - Title: The exact movie or TV show title
            - Year: Release year (if available)
            - Type: "movie", "tv", or "documentary"
            
            Respond with ONLY a JSON object in this format:
            {"title": "Movie Title", "year": 2023, "type": "movie"}
            
            If you cannot identify a movie or TV show, respond with:
            {"error": "No movie or TV show found"}`
          },
          {
            role: 'user',
            content: `URL: ${url}\n\nPage content:\n${pageContent.substring(0, 4000)}`
          }
        ],
        max_tokens: 150,
        temperature: 0.1
      }),
    });
    
    if (!openaiResponse.ok) {
      console.log('OpenAI failed, status:', openaiResponse.status);
      return null;
    }
    
    const openaiData = await openaiResponse.json();
    const aiResult = openaiData.choices[0]?.message?.content;
    
    if (!aiResult) {
      console.log('No AI result');
      return null;
    }
    
    try {
      const extractedInfo = JSON.parse(aiResult);
      
      if (extractedInfo.error) {
        console.log('AI could not extract movie/show info:', extractedInfo.error);
        return null;
      }
      
      console.log('AI extracted:', extractedInfo);
      
      // Search using the AI-extracted title
      if (extractedInfo.title) {
        return await searchContent(extractedInfo.title);
      }
      
    } catch (parseError) {
      console.log('Failed to parse AI response:', parseError);
      return null;
    }
    
  } catch (error) {
    console.error('Error in AI extraction:', error);
    return null;
  }
  
  return null;
}

async function extractWithHTMLParsing(url: string): Promise<ContentResult[]> {
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
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      title = titleMatch[1];
      console.log('Raw title extracted:', title);
      
      // Clean up IMDb title format
      title = title.replace(/\s*-\s*IMDb\s*$/i, '');
      
      // Extract year from title if present
      const yearMatch = title.match(/\((\d{4})(?:-\s*)?\)/);
      if (yearMatch) {
        year = parseInt(yearMatch[1]);
        title = title.replace(/\s*\(\d{4}(?:-\s*)?\)/, '').trim();
      }
      
      // Remove common suffixes
      title = title.replace(/\s*\|\s*.+$/, '');
      title = title.replace(/\s*-\s*watch\s+.+$/i, '');
      title = title.replace(/\s*\(TV\s+Series.*?\)$/i, '');
      title = title.replace(/\s*\(.*?\d{4}.*?\)$/i, '');
      title = title.trim();
      
      console.log('Cleaned title:', title, 'Year:', year);
    }
    
    // Check if it's a TV series
    if (html.includes('"@type":"TVSeries"') || url.includes('/title/') && html.includes('TV Series')) {
      type = 'tv';
    }
  }
  // HBO Max/Max specific extraction
  else if (url.includes('hbomax.com') || url.includes('max.com')) {
    const pathMatch = url.match(/\/(movie|series|mini-series)\/([^\/]+)/);
    if (pathMatch) {
      const urlTitle = pathMatch[2];
      if (urlTitle.match(/^[a-f0-9-]{36}$/)) {
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch) {
          title = titleMatch[1];
          title = title.replace(/\s*\|\s*(HBO|Max).*$/i, '');
          title = title.replace(/\s*-\s*(HBO|Max).*$/i, '');
          title = title.replace(/\s*\|\s*Watch.*$/i, '');
          title = title.replace(/\s*-\s*Watch.*$/i, '');
          title = title.trim();
        }
      } else {
        title = urlTitle.replace(/-/g, ' ');
      }
      
      if (pathMatch[1] === 'movie') {
        type = 'movie';
      } else if (pathMatch[1] === 'series' || pathMatch[1] === 'mini-series') {
        type = 'tv';
      }
    }
  }
  // Generic extraction for other services
  else {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      title = titleMatch[1];
      // Generic cleanup
      title = title.replace(/\s*\|\s*.+$/, '');
      title = title.replace(/\s*-\s*.+$/, '');
      title = title.trim();
    }
  }
  
  console.log('Final extracted title:', title, 'year:', year, 'type:', type);
  
  if (!title || title.length < 2) {
    const domain = url.match(/https?:\/\/(?:www\.)?([^\/]+)/)?.[1] || 'streaming service';
    console.log('Could not extract meaningful title from', domain);
    return [];
  }
  
  // Search for the extracted title
  return await searchContent(title);
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
          // Get IMDB ID for the movie
          const imdbId = await getImdbId(movie.id, 'movie', tmdbApiKey);
          const streamingSources = await getStreamingSources(movie.title, movie.release_date?.split('-')[0] || '', 'movie', streamingApiKey, imdbId);
          
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
          // Get IMDB ID for the TV show
          const imdbId = await getImdbId(show.id, 'tv', tmdbApiKey);
          const streamingSources = await getStreamingSources(show.name, show.first_air_date?.split('-')[0] || '', 'tv', streamingApiKey, imdbId);
          
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

async function getImdbId(tmdbId: number, mediaType: 'movie' | 'tv', apiKey: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/${mediaType}/${tmdbId}/external_ids?api_key=${apiKey}`
    );
    
    if (response.ok) {
      const data = await response.json();
      console.log(`IMDB ID for ${mediaType} ${tmdbId}:`, data.imdb_id);
      return data.imdb_id || null;
    }
  } catch (error) {
    console.error('Error fetching IMDB ID:', error);
  }
  
  return null;
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

async function getStreamingSources(title: string, year: string, type: string, streamingApiKey?: string, imdbId?: string | null): Promise<StreamingSource[]> {
  console.log(`Getting streaming sources for: ${title} (${year}) - ${type} - IMDB: ${imdbId}`);
  
  // If we have a RapidAPI key, use the real Streaming Availability API
  const rapidApiKey = streamingApiKey || Deno.env.get('STREAMING_AVAILABILITY_API_KEY') || Deno.env.get('RAPIDAPI_KEY');
  
  if (rapidApiKey && imdbId) {
    try {
      // Use the IMDB ID directly with the shows endpoint
      const showUrl = `https://streaming-availability.p.rapidapi.com/shows/${imdbId}`;
      const params = new URLSearchParams({
        country: 'us', // US streaming services
        output_language: 'en'
      });

      console.log('Calling Streaming Availability API with IMDB ID:', showUrl);
      
      const response = await fetch(`${showUrl}?${params}`, {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': rapidApiKey,
          'X-RapidAPI-Host': 'streaming-availability.p.rapidapi.com'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Streaming API response:', data);
        
        // Parse the response and extract streaming sources
        const sources: StreamingSource[] = [];
        
        // The direct IMDB endpoint returns the show object directly, not in a result array
        if (data && data.streamingOptions && data.streamingOptions.us) {
          // Process US streaming options
          for (const option of data.streamingOptions.us) {
            // Get service icon and details from our mapping
            const serviceName = option.service?.id || '';
            const icon = getStreamingServiceIcon(serviceName);

            // Determine the type and price based on the option type
            let streamType: 'subscription' | 'rent' | 'buy' | 'free' = 'subscription';
            let price: string | undefined = undefined;
            
            if (option.type === 'subscription') {
              streamType = 'subscription';
            } else if (option.type === 'rent') {
              streamType = 'rent';
              price = option.price ? `$${option.price.amount}` : undefined;
            } else if (option.type === 'buy') {
              streamType = 'buy';
              price = option.price ? `$${option.price.amount}` : undefined;
            } else if (option.type === 'free') {
              streamType = 'free';
            }
            
            // Check if we already have this service/type combination
            const existingSource = sources.find(s => 
              s.name === icon.name && s.type === streamType
            );
            
            if (!existingSource) {
              sources.push({
                name: icon.name,
                logo: icon.logo,
                url: option.link || `https://www.${serviceName}.com`,
                type: streamType,
                price: price
              });
            }
          }
        }
        
        if (sources.length > 0) {
          console.log(`Found ${sources.length} streaming sources from API`);
          return sources;
        }
      } else {
        console.log('Streaming API error:', response.status, await response.text());
      }
    } catch (error) {
      console.error('Error calling Streaming Availability API:', error);
    }
  }
  
  // If no IMDB ID or API call failed, try the title search as fallback
  if (rapidApiKey && !imdbId) {
    try {
      const searchUrl = `https://streaming-availability.p.rapidapi.com/search/title`;
      const params = new URLSearchParams({
        title: title,
        country: 'us',
        show_type: type === 'tv' ? 'series' : 'movie',
        output_language: 'en'
      });

      console.log('Falling back to title search:', searchUrl);
      
      const response = await fetch(`${searchUrl}?${params}`, {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': rapidApiKey,
          'X-RapidAPI-Host': 'streaming-availability.p.rapidapi.com'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Title search response:', data);
        
        const sources: StreamingSource[] = [];
        
        if (data.result && data.result.length > 0) {
          const show = data.result[0];
          
          if (show.streamingOptions && show.streamingOptions.us) {
            for (const option of show.streamingOptions.us) {
              const serviceName = option.service?.id || '';
              const icon = getStreamingServiceIcon(serviceName);

              let streamType: 'subscription' | 'rent' | 'buy' | 'free' = 'subscription';
              let price: string | undefined = undefined;
              
              if (option.type === 'subscription') {
                streamType = 'subscription';
              } else if (option.type === 'rent') {
                streamType = 'rent';
                price = option.price ? `$${option.price.amount}` : undefined;
              } else if (option.type === 'buy') {
                streamType = 'buy';
                price = option.price ? `$${option.price.amount}` : undefined;
              } else if (option.type === 'free') {
                streamType = 'free';
              }
              
              const existingSource = sources.find(s => 
                s.name === icon.name && s.type === streamType
              );
              
              if (!existingSource) {
                sources.push({
                  name: icon.name,
                  logo: icon.logo,
                  url: option.link || `https://www.${serviceName}.com`,
                  type: streamType,
                  price: price
                });
              }
            }
          }
        }
        
        if (sources.length > 0) {
          console.log(`Found ${sources.length} streaming sources from title search`);
          return sources;
        }
      }
    } catch (error) {
      console.error('Error with title search fallback:', error);
    }
  }
  
  // Fallback: Generate search-based deep links if API fails or no key
  console.log('Using fallback search links (no API key or API failed)');
  const searchQuery = encodeURIComponent(title);
  
  const fallbackServices = ['netflix', 'prime', 'disney', 'max', 'hulu'];
  const fallbackSources: StreamingSource[] = [];
  
  for (const serviceId of fallbackServices.slice(0, Math.floor(Math.random() * 3) + 2)) {
    const icon = getStreamingServiceIcon(serviceId);
    let searchUrl = '';
    
    switch(serviceId) {
      case 'netflix':
        searchUrl = `https://www.netflix.com/search?q=${searchQuery}`;
        break;
      case 'prime':
        searchUrl = `https://www.amazon.com/s?k=${searchQuery}&i=instant-video`;
        break;
      case 'disney':
        searchUrl = `https://www.disneyplus.com/search?q=${searchQuery}`;
        break;
      case 'max':
        searchUrl = `https://www.max.com/search?q=${searchQuery}`;
        break;
      case 'hulu':
        searchUrl = `https://www.hulu.com/search?q=${searchQuery}`;
        break;
    }
    
    fallbackSources.push({
      name: icon.name,
      logo: icon.logo,
      url: searchUrl,
      type: 'subscription'
    });
  }
  
  return fallbackSources;
}