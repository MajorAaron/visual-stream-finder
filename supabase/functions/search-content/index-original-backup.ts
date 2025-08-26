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
    Logger.openai.start('gpt-4o-mini', 600, 'Content extraction and streaming analysis');
    
    const openaiRequestBody = {
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a media identification expert. Analyze the provided text input and identify what movie, TV show, or other media content is being referenced.

**Your task:**
- Parse the text for clues like titles, URLs, plot descriptions, character names, or service listings
- Identify the specific movie, TV show, documentary, or other media content
- Handle partial information, typos, or ambiguous references
- Provide your best match even with incomplete information
- Retrive the deep link url to the show/movie on each of the top streaming platforms. 

**Input types you might receive:**
- Movie/show URLs (Netflix, IMDb, streaming services, etc.)
- Plot summaries or descriptions
- Character names and brief descriptions  
- Service listings (e.g., "that action movie with the guy from Top Gun")
- Partial titles or misspelled names
- Reviews or comments mentioning the content

**Response format (JSON only):**
{
  "title": "[Movie/Show name]",
  "type": "[Movie/TV Show/Documentary/Series/etc.]",
  "year": "[Release year if known]",
  "confidence": "[High/Medium/Low]",
  "reasoning": "[Brief explanation of what textual elements led to your identification]",
  "additional_info": "[Director, main actors, or distinguishing details if helpful]",
  "streaming_sources": [
    {
      "service": "[Platform name]",
      "link": "[Direct URL or search URL]",
      "type": "[subscription/rent/buy/free]",
      "price": "[Optional price if rent/buy]"
    }
  ]
}

**For streaming sources, provide direct deeplinks when possible:** 
Below are example links, replace the id's with the actual id of the piece of content. 

- Netflix: https://www.netflix.com/browse?jbv=81665094
- Prime Video: https://www.primevideo.com/detail/0LH21W6PIX48F9NTMMUGL2YOGN
- Disney+: https://www.disneyplus.com/browse/entity-ec9f9fa3-fbae-4a25-b722-12c3b8ab0ef4
- Hulu: https://www.hulu.com/movie/80484751-3c5b-494e-b1f5-69811be90d55
- Max: https://play.hbomax.com/mini-series/f3b98d14-5232-488c-a05a-c219e0102842
- Apple TV+: https://tv.apple.com/us/show/severance/umc.cmc.1srk2goyh2q2zdxcx605w8vtx
- Paramount+: https://www.paramountplus.com/movies/video/wjQ4RChi6BHHu4MVTncppVuCwu44uq2Q/
- Peacock: https://www.peacocktv.com/watch/asset/movies/borderline/688001e6-ece9-3955-843f-771c5ec35600

**If uncertain:**
- Provide your top best guess with reasoning
- Note what additional information would help confirm the match

**If no movie or TV show can be identified, respond with:**
{"error": "No movie or TV show found"}`
        },
        {
          role: 'user',
          content: `URL: ${url}\n\nPage content:\n${pageContent.substring(0, 4000)}`
        }
      ],
      max_tokens: 600,
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
      
      if (!extractedInfo.title) {
        Logger.openai.error('No title found in AI response');
        return null;
      }
      
      Logger.openai.success(extractedInfo.title, openaiResponseTime);
      
      // If we have complete information including streaming sources, create the result directly
      if (extractedInfo.streaming_sources && Array.isArray(extractedInfo.streaming_sources)) {
        console.log(`🎯 Complete info extracted, creating result with ${extractedInfo.streaming_sources.length} streaming sources`);
        
        const streamingSources: StreamingSource[] = [];
        
        for (const source of extractedInfo.streaming_sources) {
          const serviceId = source.service.toLowerCase().replace(/[^a-z0-9]/g, '');
          const icon = getStreamingServiceIcon(serviceId);
          
          let streamType: 'subscription' | 'rent' | 'buy' | 'free' = 'subscription';
          if (source.type === 'rent') streamType = 'rent';
          else if (source.type === 'buy') streamType = 'buy';
          else if (source.type === 'free') streamType = 'free';
          
          streamingSources.push({
            name: icon.name,
            logo: icon.logo,
            url: source.link || `https://www.${serviceId}.com`,
            type: streamType,
            price: source.price
          });
          
          console.log(`➕ Added ${icon.name} (${streamType}${source.price ? `, ${source.price}` : ''})`);
        }
        
        // Get poster from TMDB for the extracted title
        console.log(`🖼️  Fetching poster from TMDB for: "${extractedInfo.title}"`);
        const tmdbResults = await searchContent(extractedInfo.title);
        const poster = tmdbResults.length > 0 ? tmdbResults[0].poster : '';
        
        const result: ContentResult = {
          title: extractedInfo.title,
          year: parseInt(extractedInfo.year) || 0,
          type: extractedInfo.type === 'tv' || extractedInfo.type === 'TV Show' || extractedInfo.type === 'Series' ? 'tv' : 
                extractedInfo.type === 'documentary' || extractedInfo.type === 'Documentary' ? 'documentary' : 'movie',
          genre: [],
          rating: 0,
          plot: extractedInfo.additional_info || 'No plot available',
          poster: poster,
          streamingSources: streamingSources,
          confidence: extractedInfo.confidence === 'High' ? 0.95 : extractedInfo.confidence === 'Medium' ? 0.8 : 0.6,
          releaseDate: extractedInfo.year ? `${extractedInfo.year}-01-01` : undefined
        };
        
        return [result];
      }
      
      // Fallback: Search using the AI-extracted title
      if (extractedInfo.title) {
        console.log(`🔄 Searching TMDB for extracted title: "${extractedInfo.title}"`);
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
  const domain = url.match(/https?:\/\/(?:www\.)?([^/]+)/)?.[1] || 'unknown domain';
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
      const pathMatch = url.match(/\/(movie|series|mini-series)\/([^/]+)/);
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
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  const tmdbApiKey = Deno.env.get('TMDB_API_KEY');
  
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  if (!tmdbApiKey) {
    throw new Error('TMDB API key not configured');
  }

  try {
    console.group('🔍 OpenAI Web Search Content Identification');
    console.log(`🎬 Searching for: "${query}"`);
    
    // Use OpenAI with web search to identify content and find streaming sources
    const openaiTimer = Logger.startTimer('OpenAI Content Search');
    Logger.openai.start('gpt-4o', 1500, 'Content identification with web search');
    
    const openaiRequestBody = {
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a media identification expert. Analyze the provided text input and identify what movie, TV show, or other media content is being referenced.

**Your task:**
- Parse the text for clues like titles, URLs, plot descriptions, character names, or service listings
- Identify the specific movie, TV show, documentary, or other media content
- Handle partial information, typos, or ambiguous references
- Provide your best match even with incomplete information
- Based on your knowledge, provide likely streaming platforms where this content can be found
- Retrive the deep link url to the show/movie on each of the top streaming platforms. 

**Input types you might receive:**
- Movie/show URLs (Netflix, IMDb, streaming services, etc.)
- Plot summaries or descriptions
- Character names and brief descriptions  
- Service listings (e.g., "that action movie with the guy from Top Gun")
- Partial titles or misspelled names
- Reviews or comments mentioning the content

**Response format (JSON only):**
{
  "results": [
    {
      "title": "[Movie/Show name]",
      "type": "[Movie/TV Show/Documentary/Series/etc.]",
      "year": "[Release year if known]",
      "confidence": "[High/Medium/Low]",
      "reasoning": "[Brief explanation of what textual elements led to your identification]",
      "additional_info": "[Director, main actors, or distinguishing details if helpful]",
      "streaming_sources": [
        {
          "service": "[Platform name]",
          "link": "[Direct URL or search URL]",
          "type": "[subscription/rent/buy/free]",
          "price": "[Optional price if rent/buy]"
        }
      ]
    }
  ]
}

**For streaming sources, provide search URLs for the most likely platforms:**
Below are example links, replace the id's with the actual id of the piece of content. 

- Netflix: https://www.netflix.com/browse?jbv=81665094
- Prime Video: https://www.primevideo.com/detail/0LH21W6PIX48F9NTMMUGL2YOGN
- Disney+: https://www.disneyplus.com/browse/entity-ec9f9fa3-fbae-4a25-b722-12c3b8ab0ef4
- Hulu: https://www.hulu.com/movie/80484751-3c5b-494e-b1f5-69811be90d55
- Max: https://play.hbomax.com/mini-series/f3b98d14-5232-488c-a05a-c219e0102842
- Apple TV+: https://tv.apple.com/us/show/severance/umc.cmc.1srk2goyh2q2zdxcx605w8vtx
- Paramount+: https://www.paramountplus.com/movies/video/wjQ4RChi6BHHu4MVTncppVuCwu44uq2Q/
- Peacock: https://www.peacocktv.com/watch/asset/movies/borderline/688001e6-ece9-3955-843f-771c5ec35600

**Content availability guidelines:**
- Movies: Often available on Netflix, Prime Video, Hulu, Max, Disney+ (for Disney content)
- Recent blockbusters: Prime Video (rent/buy), Apple TV+, Vudu
- Disney/Marvel/Star Wars: Disney+ (subscription)
- HBO content: Max (subscription)
- NBC content: Peacock (subscription)
- Paramount content: Paramount+ (subscription)

**Include 3-5 most likely streaming platforms based on the content type and your knowledge.**

**If uncertain:**
- Provide your top 2-3 best guesses with reasoning
- Note what additional information would help confirm the match

**If no movie or TV show can be identified, respond with:**
{"error": "No movie or TV show found"}`
        },
        {
          role: 'user',
          content: query
        }
      ],
      max_tokens: 1500,
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
      console.groupEnd();
      return [];
    }
    
    const openaiData = await openaiResponse.json();
    RawLogger.logResponse('OpenAI', openaiResponse.status, openaiResponseHeaders, openaiData, openaiResponseTime);
    
    // Get the response content from OpenAI
    const message = openaiData.choices[0]?.message;
    const finalContent = message?.content;
    
    if (!finalContent) {
      Logger.openai.error('Empty response from OpenAI');
      console.groupEnd();
      return [];
    }
    
    console.log(`🤖 AI Response: ${finalContent}`);
    
    let extractedInfo;
    try {
      // Clean the response by removing markdown code block formatting if present
      let cleanContent = finalContent;
      if (cleanContent.startsWith('```json') && cleanContent.endsWith('```')) {
        cleanContent = cleanContent.slice(7, -3).trim();
      } else if (cleanContent.startsWith('```') && cleanContent.endsWith('```')) {
        cleanContent = cleanContent.slice(3, -3).trim();
      }
      
      extractedInfo = JSON.parse(cleanContent);
    } catch (parseError) {
      Logger.openai.error(`Failed to parse JSON: ${parseError.message}`);
      console.groupEnd();
      return [];
    }
    
    if (extractedInfo.error) {
      Logger.openai.error(`AI extraction failed: ${extractedInfo.error}`);
      console.groupEnd();
      return [];
    }
    
    if (!extractedInfo.results || !Array.isArray(extractedInfo.results)) {
      Logger.openai.error('No valid results in response');
      console.groupEnd();
      return [];
    }
    
    console.groupEnd();
    
    // Process each result and get posters from TMDB
    const results: ContentResult[] = [];
    console.log(`🔄 Processing ${extractedInfo.results.length} identified items...`);
    
    for (const [index, item] of extractedInfo.results.slice(0, 3).entries()) {
      console.group(`🎬 Processing ${index + 1}: ${item.title} (${item.year || 'Unknown'})`);
      
      if (!item.title) {
        console.log('❌ No title found, skipping...');
        console.groupEnd();
        continue;
      }
      
      // Get poster from TMDB
      console.log(`🖼️  Fetching poster from TMDB for: "${item.title}"`);
      const poster = await getTMDBPoster(item.title, item.year, item.type, tmdbApiKey);
      
      // Process streaming sources from OpenAI
      const streamingSources: StreamingSource[] = [];
      if (item.streaming_sources && Array.isArray(item.streaming_sources)) {
        for (const source of item.streaming_sources) {
          const serviceId = source.service.toLowerCase().replace(/[^a-z0-9]/g, '');
          const icon = getStreamingServiceIcon(serviceId);
          
          let streamType: 'subscription' | 'rent' | 'buy' | 'free' = 'subscription';
          if (source.type === 'rent') streamType = 'rent';
          else if (source.type === 'buy') streamType = 'buy';
          else if (source.type === 'free') streamType = 'free';
          
          streamingSources.push({
            name: icon.name,
            logo: icon.logo,
            url: source.link || `https://www.${serviceId}.com`,
            type: streamType,
            price: source.price
          });
          
          console.log(`➕ Added ${icon.name} (${streamType}${source.price ? `, ${source.price}` : ''})`);
        }
      }
      
      // If no streaming sources, use fallback
      const finalStreamingSources = streamingSources.length > 0 
        ? streamingSources 
        : getFallbackStreamingSources(item.title);
      
      results.push({
        title: item.title,
        year: parseInt(item.year) || 0,
        type: item.type === 'tv' || item.type === 'TV Show' || item.type === 'Series' ? 'tv' : 
              item.type === 'documentary' || item.type === 'Documentary' ? 'documentary' : 'movie',
        genre: [],
        rating: 0,
        plot: item.additional_info || 'No plot available',
        poster: poster,
        streamingSources: finalStreamingSources,
        confidence: item.confidence === 'High' ? 0.95 : item.confidence === 'Medium' ? 0.8 : 0.6,
        releaseDate: item.year ? `${item.year}-01-01` : undefined
      });
      
      console.log(`✅ Processed with ${finalStreamingSources.length} streaming sources`);
      console.groupEnd();
    }
    
    console.log(`🎯 Final results: ${results.length} items`);
    return results;
    
  } catch (error) {
    Logger.openai.error(`Unexpected error: ${error.message}`);
    throw error;
  }
}

async function getTMDBPoster(title: string, year?: string, type?: string, apiKey?: string): Promise<string> {
  if (!apiKey) return '';

  try {
    // Determine search endpoint based on type
    const searchType = type === 'tv' || type === 'TV Show' || type === 'Series' ? 'tv' : 'movie';
    const searchUrl = `https://api.themoviedb.org/3/search/${searchType}?api_key=${apiKey}&query=${encodeURIComponent(title)}`;
    
    console.log(`🔍 TMDB ${searchType} search: ${title} ${year ? `(${year})` : ''}`);
    
    const response = await fetch(searchUrl);
    if (!response.ok) {
      console.log(`❌ TMDB search failed: ${response.status}`);
      return '';
    }

    const data = await response.json();
    const results = data.results || [];
    
    if (results.length === 0) {
      console.log(`🚫 No TMDB results found for: ${title}`);
      return '';
    }

    // Find best match, preferring year matches if available
    let bestMatch = results[0];
    if (year) {
      const yearNum = parseInt(year);
      const yearMatch = results.find((result: any) => {
        const resultYear = searchType === 'movie' 
          ? result.release_date?.split('-')[0]
          : result.first_air_date?.split('-')[0];
        return parseInt(resultYear) === yearNum;
      });
      if (yearMatch) {
        bestMatch = yearMatch;
      }
    }

    const posterPath = bestMatch.poster_path;
    if (posterPath) {
      const fullPosterUrl = `https://image.tmdb.org/t/p/w500${posterPath}`;
      console.log(`🖼️  Found poster: ${fullPosterUrl}`);
      return fullPosterUrl;
    }

    console.log(`🚫 No poster available for: ${title}`);
    return '';
    
  } catch (error) {
    console.log(`❌ Error fetching TMDB poster: ${error.message}`);
    return '';
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

async function getStreamingSources(title: string, year: string, type: string): Promise<StreamingSource[]> {
  const timer = Logger.startTimer('OpenAI Web Search Streaming Sources');
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  
  Logger.streaming.start(title, year, type);
  
  if (!openaiApiKey) {
    Logger.openai.noApiKey();
    return getFallbackStreamingSources(title);
  }
  
  try {
    const openaiRequestBody = {
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a media identification expert. Analyze the provided content information and provide streaming availability based on your knowledge.

**Your task:**
- Identify the specific movie, TV show, documentary, or other media content
- Based on your knowledge, provide likely streaming platforms where this content can be found
- Provide streaming platform availability with search links
- Retrive the deep link url to the show/movie on each of the top streaming platforms. 


**Response format (JSON only):**
{
  "title": "[Movie/Show name]",
  "type": "[Movie/TV Show/Documentary/Series/etc.]",
  "year": "[Release year if known]",
  "confidence": "[High/Medium/Low]",
  "streaming_sources": [
    {
      "service": "[Platform name]",
      "link": "[Search URL]",
      "type": "[subscription/rent/buy/free]",
      "price": "[Optional price if rent/buy]"
    }
  ]
}

**For streaming sources, provide deep link URLs:**
Below are example links, replace the id's with the actual id of the piece of content. 

- Netflix: https://www.netflix.com/browse?jbv=81665094
- Prime Video: https://www.primevideo.com/detail/0LH21W6PIX48F9NTMMUGL2YOGN
- Disney+: https://www.disneyplus.com/browse/entity-ec9f9fa3-fbae-4a25-b722-12c3b8ab0ef4
- Hulu: https://www.hulu.com/movie/80484751-3c5b-494e-b1f5-69811be90d55
- Max: https://play.hbomax.com/mini-series/f3b98d14-5232-488c-a05a-c219e0102842
- Apple TV+: https://tv.apple.com/us/show/severance/umc.cmc.1srk2goyh2q2zdxcx605w8vtx
- Paramount+: https://www.paramountplus.com/movies/video/wjQ4RChi6BHHu4MVTncppVuCwu44uq2Q/
- Peacock: https://www.peacocktv.com/watch/asset/movies/borderline/688001e6-ece9-3955-843f-771c5ec35600

**Content availability guidelines:**
- Movies: Often available on Netflix, Prime Video, Hulu, Max, Disney+ (for Disney content)
- Recent blockbusters: Prime Video (rent/buy), Apple TV+, Vudu
- Disney/Marvel/Star Wars: Disney+ (subscription)
- HBO content: Max (subscription)
- NBC content: Peacock (subscription)
- Paramount content: Paramount+ (subscription)

**Include 2-5 most relevant streaming platforms based on the content type and your knowledge.**`
        },
        {
          role: 'user',
          content: `Find current streaming sources for: "${title}" (${year}) - ${type}`
        }
      ],
      max_tokens: 1000,
      temperature: 0.1
    };
    
    const openaiHeaders = {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    };
    
    Logger.openai.start('gpt-4o', 1000, 'Web search streaming source identification');
    RawLogger.logRequest('OpenAI', 'POST', 'https://api.openai.com/v1/chat/completions', openaiHeaders, openaiRequestBody);
    
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: openaiHeaders,
      body: JSON.stringify(openaiRequestBody),
    });
    
    const responseTime = timer.end();
    const openaiResponseHeaders = Object.fromEntries([...openaiResponse.headers.entries()]);
    
    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      RawLogger.logResponse('OpenAI', openaiResponse.status, openaiResponseHeaders, errorText, responseTime);
      Logger.openai.error(`Status ${openaiResponse.status}`);
      return getFallbackStreamingSources(title);
    }
    
    const openaiData = await openaiResponse.json();
    RawLogger.logResponse('OpenAI', openaiResponse.status, openaiResponseHeaders, openaiData, responseTime);
    
    // Get the response content from OpenAI  
    const message = openaiData.choices[0]?.message;
    const finalContent = message?.content;
    
    if (!finalContent) {
      Logger.openai.error('Empty response from OpenAI');
      return getFallbackStreamingSources(title);
    }
    
    console.log(`🤖 AI Response: ${finalContent}`);
    
    try {
      // Clean the response by removing markdown code block formatting if present
      let cleanContent = finalContent;
      if (cleanContent.startsWith('```json') && cleanContent.endsWith('```')) {
        cleanContent = cleanContent.slice(7, -3).trim();
      } else if (cleanContent.startsWith('```') && cleanContent.endsWith('```')) {
        cleanContent = cleanContent.slice(3, -3).trim();
      }
      
      const extractedInfo = JSON.parse(cleanContent);
      
      if (!extractedInfo.streaming_sources || !Array.isArray(extractedInfo.streaming_sources)) {
        Logger.openai.error('No valid streaming sources in response');
        return getFallbackStreamingSources(title);
      }
      
      const sources: StreamingSource[] = [];
      
      for (const source of extractedInfo.streaming_sources) {
        const serviceId = source.service.toLowerCase().replace(/[^a-z0-9]/g, '');
        const icon = getStreamingServiceIcon(serviceId);
        
        // Map the AI response type to our expected types
        let streamType: 'subscription' | 'rent' | 'buy' | 'free' = 'subscription';
        if (source.type === 'rent') streamType = 'rent';
        else if (source.type === 'buy') streamType = 'buy';
        else if (source.type === 'free') streamType = 'free';
        
        sources.push({
          name: icon.name,
          logo: icon.logo,
          url: source.link || `https://www.${serviceId}.com`,
          type: streamType,
          price: source.price
        });
        
        console.log(`➕ Added ${icon.name} (${streamType}${source.price ? `, ${source.price}` : ''})`);
      }
      
      Logger.streaming.success(sources.length, responseTime);
      Logger.openai.success(extractedInfo.title || title, responseTime);
      return sources;
      
    } catch (parseError) {
      Logger.openai.error(`Failed to parse JSON: ${parseError.message}`);
      return getFallbackStreamingSources(title);
    }
    
  } catch (error) {
    Logger.openai.error(`Unexpected error: ${error.message}`);
    return getFallbackStreamingSources(title);
  }
}

// Fallback function for generating search-based links when OpenAI fails
function getFallbackStreamingSources(title: string): StreamingSource[] {
  Logger.streaming.fallback('Using fallback search links');
  
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