import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getStreamingServiceIcon } from "../streaming-icons.ts";

// Raw API logging utilities
const RawLogger = {
  maskApiKey: (key: string): string => {
    if (!key || key.length < 8) return '[HIDDEN]';
    return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
  },

  logRequest: (service: string, method: string, url: string, headers: Record<string, string> = {}, body: any = null) => {
    console.log(`\n📦 RAW REQUEST (${service}):`);
    console.log(`- URL: ${url}`);
    console.log(`- Method: ${method}`);
    console.log(`- Headers: ${JSON.stringify({
      ...headers,
      'Authorization': headers['Authorization'] ? `Bearer ${RawLogger.maskApiKey(headers['Authorization'].replace('Bearer ', ''))}` : undefined,
      'X-RapidAPI-Key': headers['X-RapidAPI-Key'] ? RawLogger.maskApiKey(headers['X-RapidAPI-Key']) : undefined
    }, null, 2)}`);
    if (body) {
      console.log(`- Body/Params: ${JSON.stringify(body, null, 2)}`);
    }
  },

  logResponse: (service: string, status: number, headers: Record<string, string> = {}, body: any = null, duration: number) => {
    console.log(`\n📥 RAW RESPONSE (${service}):`);
    console.log(`- Status: ${status}`);
    console.log(`- Headers: ${JSON.stringify(headers, null, 2)}`);
    if (body) {
      const bodyStr = typeof body === 'string' ? body : JSON.stringify(body, null, 2);
      const truncated = bodyStr.length > 2000 ? bodyStr.substring(0, 2000) + '...[TRUNCATED]' : bodyStr;
      console.log(`- Body: ${truncated}`);
    }
    console.log(`- Duration: ${duration.toFixed(2)}ms\n`);
  }
};

// Enhanced logging utilities
const Logger = {
  // Performance timing utilities
  startTimer: (operation: string) => {
    const start = performance.now();
    return {
      end: () => {
        const duration = (performance.now() - start).toFixed(2);
        console.log(`⏱️  Duration: ${duration}ms`);
        return parseFloat(duration);
      }
    };
  },

  // Service-specific logging with emojis and styling
  firecrawl: {
    start: (url: string) => {
      console.group(`🔥 Firecrawl API`);
      console.log(`🌐 Extracting content from: ${url}`);
      console.log(`📤 Endpoint: https://api.firecrawl.dev/v1/scrape`);
    },
    request: (config: any) => {
      console.log(`⚙️  Config: onlyMainContent=${config.onlyMainContent}, timeout=${config.timeout}ms`);
      console.log(`📋 Formats: ${config.formats.join(', ')}`);
    },
    success: (contentLength: number, responseTime?: number) => {
      if (responseTime) console.log(`✅ Response received in ${responseTime}ms`);
      console.log(`📄 Content extracted: ${contentLength} characters`);
      console.groupEnd();
    },
    error: (error: string) => {
      console.log(`❌ Firecrawl Error: ${error}`);
      console.groupEnd();
    },
    noApiKey: () => {
      console.log(`⚠️  No Firecrawl API key available`);
      console.groupEnd();
    }
  },

  openai: {
    start: (model: string, tokens: number, task: string) => {
      console.group(`🤖 OpenAI API`);
      console.log(`🎯 Task: ${task}`);
      console.log(`📝 Model: ${model}`);
      console.log(`🎯 Max Tokens: ${tokens}`);
    },
    success: (extractedTitle: string, responseTime?: number) => {
      if (responseTime) console.log(`✅ Response received in ${responseTime}ms`);
      console.log(`🎬 Extracted: "${extractedTitle}"`);
      console.groupEnd();
    },
    error: (error: string) => {
      console.log(`❌ OpenAI Error: ${error}`);
      console.groupEnd();
    },
    noApiKey: () => {
      console.log(`⚠️  No OpenAI API key available`);
      console.groupEnd();
    }
  },

  tmdb: {
    start: (query: string, searchType: 'movie' | 'tv') => {
      console.group(`🎬 TMDB API`);
      console.log(`🔍 Searching ${searchType}s: "${query}"`);
    },
    request: (url: string, page: number = 1) => {
      console.log(`📤 Request URL: ${url}`);
      console.log(`📄 Page: ${page}`);
    },
    success: (resultsCount: number, responseTime?: number) => {
      if (responseTime) console.log(`✅ Response received in ${responseTime}ms`);
      console.log(`🎯 Results found: ${resultsCount}`);
      console.groupEnd();
    },
    genreRequest: (mediaType: string) => {
      console.log(`🎭 Fetching ${mediaType} genres...`);
    },
    imdbRequest: (tmdbId: number, mediaType: string) => {
      console.log(`🆔 Fetching IMDB ID for ${mediaType} ${tmdbId}...`);
    },
    error: (error: any) => {
      console.log(`❌ TMDB API Error: ${error.message || error}`);
      console.groupEnd();
    }
  },

  streaming: {
    start: (title: string, year: string, type: string, imdbId?: string) => {
      console.group(`🎭 Streaming Availability API`);
      console.log(`🔍 Searching: "${title}" (${year})`);
      console.log(`📺 Type: ${type}`);
      if (imdbId) console.log(`🆔 IMDB ID: ${imdbId}`);
    },
    request: (url: string, endpoint: string) => {
      console.log(`📤 Endpoint: ${endpoint}`);
      console.log(`📤 URL: ${url}`);
    },
    success: (sourcesCount: number, responseTime?: number) => {
      if (responseTime) console.log(`✅ Response received in ${responseTime}ms`);
      console.log(`🎯 Streaming sources found: ${sourcesCount}`);
      console.groupEnd();
    },
    fallback: (reason: string) => {
      console.log(`⚠️  Using fallback sources: ${reason}`);
      console.groupEnd();
    },
    error: (status: number, error: string) => {
      console.log(`❌ API Error - Status: ${status}`);
      console.log(`💭 Error: ${error}`);
      console.groupEnd();
    }
  },

  htmlParsing: {
    start: (url: string, domain: string) => {
      console.group(`🕷️  HTML Parsing`);
      console.log(`🌐 URL: ${url}`);
      console.log(`🏠 Domain: ${domain}`);
    },
    extracted: (title: string, year: number, type: string) => {
      console.log(`📺 Title: "${title}"`);
      console.log(`📅 Year: ${year}`);
      console.log(`🎭 Type: ${type}`);
      console.groupEnd();
    },
    failed: (reason: string) => {
      console.log(`❌ Extraction failed: ${reason}`);
      console.groupEnd();
    }
  },

  request: {
    start: (operation: string, query: string) => {
      console.group(`🚀 ${operation}`);
      console.log(`⏰ Started at: ${new Date().toISOString()}`);
      console.log(`🔍 Query: "${query}"`);
    },
    urlDetected: (url: string, service: string | null) => {
      console.log(`🔗 URL detected: ${url}`);
      if (service) {
        console.log(`🎭 Service detected: ${service}`);
      }
    },
    end: (resultsCount: number, totalTime: number) => {
      console.log(`🎯 Results found: ${resultsCount}`);
      console.log(`⚡ Total processing time: ${totalTime.toFixed(2)}ms`);
      console.groupEnd();
    }
  }
};

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

  const requestTimer = Logger.startTimer('Total Request');
  
  try {
    const { query } = await req.json();
    
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      console.log('❌ Missing or invalid query parameter');
      return new Response(
        JSON.stringify({ error: 'Query parameter is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if the query is a URL
    const isUrl = query.trim().match(/^https?:\/\/.+/);
    let results;
    let sourceService = null;
    
    if (isUrl) {
      Logger.request.start('URL-based Content Search', query.trim());
      // Extract the streaming service from the URL
      sourceService = getStreamingServiceFromUrl(query.trim());
      if (sourceService) {
        Logger.request.urlDetected(query.trim(), sourceService.name);
      } else {
        Logger.request.urlDetected(query.trim(), null);
      }
      results = await searchByUrl(query.trim());
    } else {
      Logger.request.start('Text-based Content Search', query.trim());
      results = await searchContent(query.trim());
    }
    
    // Add the source service to results if it was detected from a URL
    if (sourceService && results.length > 0) {
      console.log(`🎭 Adding detected service "${sourceService.name}" to ${results.length} results`);
      results = results.map(result => ({
        ...result,
        streamingSources: addSourceServiceToResults(result.streamingSources, sourceService)
      }));
    }
    
    const totalTime = requestTimer.end();
    Logger.request.end(results.length, totalTime);
    
    return new Response(
      JSON.stringify({ results }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    const totalTime = requestTimer.end();
    console.group('💥 Error in search-content function');
    console.log(`❌ Error: ${error.message}`);
    console.log(`⏱️  Request duration: ${totalTime.toFixed(2)}ms`);
    console.log(`📍 Stack trace:`, error.stack);
    console.groupEnd();
    
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
  const firecrawlTimer = Logger.startTimer('Firecrawl API');
  const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  
  Logger.firecrawl.start(url);
  
  if (!firecrawlApiKey || !openaiApiKey) {
    if (!firecrawlApiKey) Logger.firecrawl.noApiKey();
    if (!openaiApiKey) Logger.openai.noApiKey();
    return null;
  }
  
  try {
    // Use Firecrawl v1 API to get clean page content
    const requestConfig = {
      url: url,
      formats: ['markdown', 'html'],
      onlyMainContent: true,
      timeout: 30000
    };
    
    Logger.firecrawl.request(requestConfig);
    
    const firecrawlHeaders = {
      'Authorization': `Bearer ${firecrawlApiKey}`,
      'Content-Type': 'application/json',
    };
    
    RawLogger.logRequest('Firecrawl', 'POST', 'https://api.firecrawl.dev/v1/scrape', firecrawlHeaders, requestConfig);
    
    const firecrawlResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: firecrawlHeaders,
      body: JSON.stringify(requestConfig),
    });
    
    const firecrawlResponseTime = firecrawlTimer.end();
    console.log(`📊 Firecrawl response status: ${firecrawlResponse.status}`);
    const firecrawlResponseHeaders = Object.fromEntries([...firecrawlResponse.headers.entries()]);
    
    if (!firecrawlResponse.ok) {
      const errorText = await firecrawlResponse.text();
      RawLogger.logResponse('Firecrawl', firecrawlResponse.status, firecrawlResponseHeaders, errorText, firecrawlResponseTime);
      Logger.firecrawl.error(`Status ${firecrawlResponse.status}: ${errorText}`);
      return null;
    }
    
    const firecrawlData = await firecrawlResponse.json();
    RawLogger.logResponse('Firecrawl', firecrawlResponse.status, firecrawlResponseHeaders, firecrawlData, firecrawlResponseTime);
    console.log(`📋 Firecrawl data structure: ${Object.keys(firecrawlData).join(', ')}`);
    
    const pageContent = firecrawlData.data?.markdown || firecrawlData.data?.html || '';
    
    if (!pageContent) {
      Logger.firecrawl.error('No content extracted from response');
      return null;
    }
    
    Logger.firecrawl.success(pageContent.length, firecrawlResponseTime);
    
    // Use OpenAI to intelligently extract movie/show information
    const openaiTimer = Logger.startTimer('OpenAI Analysis');
    Logger.openai.start('gpt-4o-mini', 150, 'Content extraction and analysis');
    
    const openaiRequestBody = {
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
    };
    
    const openaiHeaders = {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    };
    
    RawLogger.logRequest('OpenAI', 'POST', 'https://api.openai.com/v1/chat/completions', openaiHeaders, openaiRequestBody);
    
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: openaiHeaders,
      body: JSON.stringify(openaiRequestBody),
    });
    
    const openaiResponseTime = openaiTimer.end();
    const openaiResponseHeaders = Object.fromEntries([...openaiResponse.headers.entries()]);
    
    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      RawLogger.logResponse('OpenAI', openaiResponse.status, openaiResponseHeaders, errorText, openaiResponseTime);
      Logger.openai.error(`Status ${openaiResponse.status}`);
      return null;
    }
    
    const openaiData = await openaiResponse.json();
    RawLogger.logResponse('OpenAI', openaiResponse.status, openaiResponseHeaders, openaiData, openaiResponseTime);
    const aiResult = openaiData.choices[0]?.message?.content;
    
    if (!aiResult) {
      Logger.openai.error('Empty response from OpenAI');
      return null;
    }
    
    console.log(`🤖 AI Response: ${aiResult}`);
    
    try {
      const extractedInfo = JSON.parse(aiResult);
      
      if (extractedInfo.error) {
        Logger.openai.error(`AI extraction failed: ${extractedInfo.error}`);
        return null;
      }
      
      Logger.openai.success(extractedInfo.title, openaiResponseTime);
      
      // Search using the AI-extracted title
      if (extractedInfo.title) {
        console.log(`🔄 Searching for extracted title: "${extractedInfo.title}"`);
        return await searchContent(extractedInfo.title);
      }
      
    } catch (parseError) {
      Logger.openai.error(`Failed to parse JSON: ${parseError.message}`);
      return null;
    }
    
  } catch (error) {
    Logger.firecrawl.error(`Unexpected error: ${error.message}`);
    return null;
  }
  
  return null;
}

async function extractWithHTMLParsing(url: string): Promise<ContentResult[]> {
  const domain = url.match(/https?:\/\/(?:www\.)?([^\/]+)/)?.[1] || 'unknown domain';
  Logger.htmlParsing.start(url, domain);
  
  try {
    // Fetch the webpage content
    const fetchHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    };
    
    RawLogger.logRequest('HTML Fetch', 'GET', url, fetchHeaders);
    
    const response = await fetch(url, {
      headers: fetchHeaders
    });
    
    const responseHeaders = Object.fromEntries([...response.headers.entries()]);
    
    if (!response.ok) {
      const errorText = await response.text();
      RawLogger.logResponse('HTML Fetch', response.status, responseHeaders, errorText, 0);
      Logger.htmlParsing.failed(`HTTP ${response.status}: Failed to fetch URL`);
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }
    
    const html = await response.text();
    RawLogger.logResponse('HTML Fetch', response.status, responseHeaders, html.substring(0, 1000) + '...[HTML_TRUNCATED]', 0);
    console.log(`📄 HTML content size: ${(html.length / 1024).toFixed(2)} KB`);
    
    // Extract title and other info from HTML
    let title = '';
    let year = 0;
    let type: 'movie' | 'tv' | 'documentary' = 'movie';
    
    // IMDb specific extraction
    if (url.includes('imdb.com')) {
      console.log('🎬 Using IMDb-specific extraction');
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleMatch) {
        title = titleMatch[1];
        console.log(`📝 Raw IMDb title: "${title}"`);
        
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
        
        console.log(`✨ Cleaned IMDb title: "${title}" (${year})`);
      }
      
      // Check if it's a TV series
      if (html.includes('"@type":"TVSeries"') || (url.includes('/title/') && html.includes('TV Series'))) {
        type = 'tv';
        console.log('📺 Detected as TV series');
      }
    }
    // HBO Max/Max specific extraction
    else if (url.includes('hbomax.com') || url.includes('max.com')) {
      console.log('🔴 Using HBO Max/Max-specific extraction');
      const pathMatch = url.match(/\/(movie|series|mini-series)\/([^\/]+)/);
      if (pathMatch) {
        const urlTitle = pathMatch[2];
        console.log(`🔍 Path type: ${pathMatch[1]}, URL slug: ${urlTitle}`);
        
        if (urlTitle.match(/^[a-f0-9-]{36}$/)) {
          console.log('🔑 UUID-based URL, extracting from HTML title');
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
          console.log('📝 Slug-based URL, converting to title');
          title = urlTitle.replace(/-/g, ' ');
        }
        
        if (pathMatch[1] === 'movie') {
          type = 'movie';
        } else if (pathMatch[1] === 'series' || pathMatch[1] === 'mini-series') {
          type = 'tv';
        }
        
        console.log(`✨ HBO Max title: "${title}" (type: ${type})`);
      }
    }
    // Generic extraction for other services
    else {
      console.log('🌐 Using generic extraction');
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleMatch) {
        title = titleMatch[1];
        console.log(`📝 Raw generic title: "${title}"`);
        // Generic cleanup
        title = title.replace(/\s*\|\s*.+$/, '');
        title = title.replace(/\s*-\s*.+$/, '');
        title = title.trim();
        console.log(`✨ Cleaned generic title: "${title}"`);
      }
    }
    
    if (!title || title.length < 2) {
      Logger.htmlParsing.failed(`Title too short or empty: "${title}"`);
      return [];
    }
    
    Logger.htmlParsing.extracted(title, year, type);
    
    // Search for the extracted title
    console.log(`🔄 Searching TMDB for extracted content...`);
    return await searchContent(title);
    
  } catch (error) {
    Logger.htmlParsing.failed(`Unexpected error: ${error.message}`);
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
    console.group('🔍 TMDB Content Search');
    console.log(`🎬 Searching for: "${query}"`);
    
    // Search movies
    const movieTimer = Logger.startTimer('Movie Search');
    Logger.tmdb.start(query, 'movie');
    
    const movieUrl = `https://api.themoviedb.org/3/search/movie?api_key=${tmdbApiKey}&query=${encodeURIComponent(query)}&page=1`;
    Logger.tmdb.request(movieUrl, 1);
    RawLogger.logRequest('TMDB', 'GET', movieUrl, {});
    
    const movieResponse = await fetch(movieUrl);
    const movieResponseTime = movieTimer.end();
    const movieResponseHeaders = Object.fromEntries([...movieResponse.headers.entries()]);
    
    if (movieResponse.ok) {
      const movieData = await movieResponse.json();
      RawLogger.logResponse('TMDB', movieResponse.status, movieResponseHeaders, movieData, movieResponseTime);
      Logger.tmdb.success(movieData.results?.length || 0, movieResponseTime);
      
      if (movieData.results && movieData.results.length > 0) {
        console.log('📽️  Processing top 3 movie results...');
        for (const [index, movie] of movieData.results.slice(0, 3).entries()) {
          console.group(`🎬 Movie ${index + 1}: ${movie.title} (${movie.release_date?.split('-')[0] || 'Unknown'})`);
          
          // Get IMDB ID for the movie
          Logger.tmdb.imdbRequest(movie.id, 'movie');
          const imdbId = await getImdbId(movie.id, 'movie', tmdbApiKey);
          
          const streamingSources = await getStreamingSources(movie.title, movie.release_date?.split('-')[0] || '', 'movie', streamingApiKey, imdbId);
          
          Logger.tmdb.genreRequest('movie');
          const genres = await getGenreNames(movie.genre_ids, 'movie', tmdbApiKey);
          console.log(`🎭 Genres: ${genres.join(', ') || 'None'}`);
          
          results.push({
            title: movie.title,
            year: parseInt(movie.release_date?.split('-')[0] || '0'),
            type: 'movie',
            genre: genres,
            rating: movie.vote_average || 0,
            plot: movie.overview || 'No plot available',
            poster: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : '',
            streamingSources,
            confidence: movie.vote_count > 100 ? 0.9 : 0.7,
            releaseDate: movie.release_date
          });
          
          console.log(`✅ Movie processed with ${streamingSources.length} streaming sources`);
          console.groupEnd();
        }
      }
    } else {
      const errorText = await movieResponse.text();
      RawLogger.logResponse('TMDB', movieResponse.status, movieResponseHeaders, errorText, movieResponseTime);
      Logger.tmdb.error({ message: `Movie search failed: ${movieResponse.status}` });
    }

    // Search TV shows
    const tvTimer = Logger.startTimer('TV Search');
    Logger.tmdb.start(query, 'tv');
    
    const tvUrl = `https://api.themoviedb.org/3/search/tv?api_key=${tmdbApiKey}&query=${encodeURIComponent(query)}&page=1`;
    Logger.tmdb.request(tvUrl, 1);
    RawLogger.logRequest('TMDB', 'GET', tvUrl, {});
    
    const tvResponse = await fetch(tvUrl);
    const tvResponseTime = tvTimer.end();
    const tvResponseHeaders = Object.fromEntries([...tvResponse.headers.entries()]);
    
    if (tvResponse.ok) {
      const tvData = await tvResponse.json();
      RawLogger.logResponse('TMDB', tvResponse.status, tvResponseHeaders, tvData, tvResponseTime);
      Logger.tmdb.success(tvData.results?.length || 0, tvResponseTime);
      
      if (tvData.results && tvData.results.length > 0) {
        console.log('📺 Processing top 3 TV show results...');
        for (const [index, show] of tvData.results.slice(0, 3).entries()) {
          console.group(`📺 TV Show ${index + 1}: ${show.name} (${show.first_air_date?.split('-')[0] || 'Unknown'})`);
          
          // Get IMDB ID for the TV show
          Logger.tmdb.imdbRequest(show.id, 'tv');
          const imdbId = await getImdbId(show.id, 'tv', tmdbApiKey);
          
          const streamingSources = await getStreamingSources(show.name, show.first_air_date?.split('-')[0] || '', 'tv', streamingApiKey, imdbId);
          
          Logger.tmdb.genreRequest('tv');
          const genres = await getGenreNames(show.genre_ids, 'tv', tmdbApiKey);
          console.log(`🎭 Genres: ${genres.join(', ') || 'None'}`);
          
          results.push({
            title: show.name,
            year: parseInt(show.first_air_date?.split('-')[0] || '0'),
            type: 'tv',
            genre: genres,
            rating: show.vote_average || 0,
            plot: show.overview || 'No plot available',
            poster: show.poster_path ? `https://image.tmdb.org/t/p/w500${show.poster_path}` : '',
            streamingSources,
            confidence: show.vote_count > 100 ? 0.9 : 0.7,
            releaseDate: show.first_air_date
          });
          
          console.log(`✅ TV show processed with ${streamingSources.length} streaming sources`);
          console.groupEnd();
        }
      }
    } else {
      const errorText = await tvResponse.text();
      RawLogger.logResponse('TMDB', tvResponse.status, tvResponseHeaders, errorText, tvResponseTime);
      Logger.tmdb.error({ message: `TV search failed: ${tvResponse.status}` });
    }

    console.groupEnd();

    // Sort by popularity/rating and remove duplicates
    console.log(`🔄 Processing ${results.length} total results...`);
    const uniqueResults = results.filter((result, index, self) => 
      index === self.findIndex(r => r.title.toLowerCase() === result.title.toLowerCase() && r.year === result.year)
    );
    
    console.log(`✂️  After deduplication: ${uniqueResults.length} unique results`);
    const finalResults = uniqueResults.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
    console.log(`🎯 Final results: ${finalResults.length} items (sorted by confidence)`);
    
    return finalResults;
    
  } catch (error) {
    Logger.tmdb.error(error);
    throw error;
  }
}

async function getImdbId(tmdbId: number, mediaType: 'movie' | 'tv', apiKey: string): Promise<string | null> {
  try {
    const url = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}/external_ids?api_key=${apiKey}`;
    RawLogger.logRequest('TMDB', 'GET', url, {});
    
    const response = await fetch(url);
    const responseHeaders = Object.fromEntries([...response.headers.entries()]);
    
    if (response.ok) {
      const data = await response.json();
      RawLogger.logResponse('TMDB', response.status, responseHeaders, data, 0);
      const imdbId = data.imdb_id || null;
      console.log(`🆔 IMDB ID for ${mediaType} ${tmdbId}: ${imdbId || 'Not found'}`);
      return imdbId;
    } else {
      const errorText = await response.text();
      RawLogger.logResponse('TMDB', response.status, responseHeaders, errorText, 0);
      console.log(`❌ Failed to fetch IMDB ID: ${response.status}`);
    }
  } catch (error) {
    console.log(`❌ Error fetching IMDB ID: ${error.message}`);
  }
  
  return null;
}

async function getGenreNames(genreIds: number[], mediaType: 'movie' | 'tv', apiKey: string): Promise<string[]> {
  try {
    const url = `https://api.themoviedb.org/3/genre/${mediaType}/list?api_key=${apiKey}`;
    RawLogger.logRequest('TMDB', 'GET', url, {});
    
    const response = await fetch(url);
    const responseHeaders = Object.fromEntries([...response.headers.entries()]);
    
    if (response.ok) {
      const data = await response.json();
      RawLogger.logResponse('TMDB', response.status, responseHeaders, data, 0);
      const genreMap = new Map(data.genres.map((g: any) => [g.id, g.name]));
      const genres = genreIds.map(id => genreMap.get(id)).filter(Boolean);
      console.log(`🎭 Mapped ${genreIds.length} genre IDs to ${genres.length} names`);
      return genres;
    } else {
      const errorText = await response.text();
      RawLogger.logResponse('TMDB', response.status, responseHeaders, errorText, 0);
      console.log(`❌ Failed to fetch genres: ${response.status}`);
    }
  } catch (error) {
    console.log(`❌ Error fetching genres: ${error.message}`);
  }
  
  return [];
}

async function getStreamingSources(title: string, year: string, type: string, streamingApiKey?: string, imdbId?: string | null): Promise<StreamingSource[]> {
  const timer = Logger.startTimer('Streaming Sources');
  Logger.streaming.start(title, year, type, imdbId || undefined);
  
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

      const fullUrl = `${showUrl}?${params}`;
      const streamingHeaders = {
        'X-RapidAPI-Key': rapidApiKey,
        'X-RapidAPI-Host': 'streaming-availability.p.rapidapi.com'
      };
      
      Logger.streaming.request(fullUrl, 'IMDB Direct Lookup');
      RawLogger.logRequest('Streaming Availability', 'GET', fullUrl, streamingHeaders);
      
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: streamingHeaders
      });

      const responseTime = timer.end();
      const responseHeaders = Object.fromEntries([...response.headers.entries()]);

      if (response.ok) {
        const data = await response.json();
        RawLogger.logResponse('Streaming Availability', response.status, responseHeaders, data, responseTime);
        console.log(`📊 API response structure: ${Object.keys(data).join(', ')}`);
        
        // Parse the response and extract streaming sources
        const sources: StreamingSource[] = [];
        
        // The direct IMDB endpoint returns the show object directly, not in a result array
        if (data && data.streamingOptions && data.streamingOptions.us) {
          console.log(`🔍 Processing ${data.streamingOptions.us.length} US streaming options`);
          
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
              console.log(`➕ Adding ${icon.name} (${streamType}${price ? `, ${price}` : ''})`);
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
        
        Logger.streaming.success(sources.length, responseTime);
        return sources;
      } else {
        const errorText = await response.text();
        RawLogger.logResponse('Streaming Availability', response.status, responseHeaders, errorText, responseTime);
        Logger.streaming.error(response.status, errorText);
      }
    } catch (error) {
      Logger.streaming.error(0, `API call failed: ${error.message}`);
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

      const fullUrl = `${searchUrl}?${params}`;
      const fallbackHeaders = {
        'X-RapidAPI-Key': rapidApiKey,
        'X-RapidAPI-Host': 'streaming-availability.p.rapidapi.com'
      };
      
      Logger.streaming.request(fullUrl, 'Title Search Fallback');
      RawLogger.logRequest('Streaming Availability', 'GET', fullUrl, fallbackHeaders);
      
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: fallbackHeaders
      });
      
      const responseTime = timer.end();
      const fallbackResponseHeaders = Object.fromEntries([...response.headers.entries()]);
      
      if (response.ok) {
        const data = await response.json();
        RawLogger.logResponse('Streaming Availability', response.status, fallbackResponseHeaders, data, responseTime);
        console.log(`📊 Title search results: ${data.result?.length || 0} shows found`);
        
        const sources: StreamingSource[] = [];
        
        if (data.result && data.result.length > 0) {
          const show = data.result[0];
          console.log(`🎯 Using first result: ${show.title || 'Unknown title'}`);
          
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
                console.log(`➕ Adding ${icon.name} (${streamType}${price ? `, ${price}` : ''})`);
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
        
        Logger.streaming.success(sources.length, responseTime);
        return sources;
      } else {
        const errorText = await response.text();
        RawLogger.logResponse('Streaming Availability', response.status, fallbackResponseHeaders, errorText, responseTime);
        Logger.streaming.error(response.status, `Title search failed: ${response.status}`);
      }
    } catch (error) {
      Logger.streaming.error(0, `Title search failed: ${error.message}`);
    }
  }
  
  // Fallback: Generate search-based deep links if API fails or no key
  Logger.streaming.fallback('No API key or all API calls failed');
  
  const searchQuery = encodeURIComponent(title);
  
  const fallbackServices = ['netflix', 'prime', 'disney', 'max', 'hulu'];
  const fallbackSources: StreamingSource[] = [];
  const selectedServices = fallbackServices.slice(0, Math.floor(Math.random() * 3) + 2);
  
  console.log(`🔄 Generating ${selectedServices.length} fallback search links`);
  
  for (const serviceId of selectedServices) {
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
  
  console.log(`✅ Generated ${fallbackSources.length} fallback sources`);
  return fallbackSources;
}