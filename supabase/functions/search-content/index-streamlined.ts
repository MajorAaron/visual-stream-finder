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

// Single unified prompt for OpenAI content identification
const CONTENT_IDENTIFICATION_PROMPT = `You are a media identification expert. Analyze the provided text input and identify what movie, TV show, or other media content is being referenced.

**Your task:**
- Parse the text for clues like titles, URLs, plot descriptions, character names, or service listings
- Identify the specific movie, TV show, documentary, or other media content
- Handle partial information, typos, or ambiguous references
- Provide your best match even with incomplete information
- Find and provide deep link URLs to the show/movie on streaming platforms

**Response format (JSON only):**
{
  "title": "[Movie/Show name]",
  "type": "[movie/tv/documentary]",
  "year": "[Release year if known]",
  "confidence": "[high/medium/low]",
  "plot": "[Brief plot summary if available]",
  "streaming_sources": [
    {
      "service": "[Platform name]",
      "link": "[Direct URL with actual content ID if possible, or search URL]",
      "type": "[subscription/rent/buy/free]",
      "price": "[Optional price if rent/buy]"
    }
  ]
}

**For streaming sources, provide direct deeplinks when possible:**
- Netflix: https://www.netflix.com/browse?jbv=[contentId]
- Prime Video: https://www.primevideo.com/detail/[contentId]
- Disney+: https://www.disneyplus.com/browse/entity-[contentId]
- Hulu: https://www.hulu.com/movie/[contentId]
- Max: https://play.max.com/[type]/[contentId]
- Apple TV+: https://tv.apple.com/us/show/[showName]/[contentId]
- Paramount+: https://www.paramountplus.com/movies/video/[contentId]
- Peacock: https://www.peacocktv.com/watch/asset/movies/[name]/[contentId]

**If no specific IDs are known, provide search URLs:**
- Netflix: https://www.netflix.com/search?q=[title]
- Prime Video: https://www.amazon.com/s?k=[title]&i=instant-video
- Disney+: https://www.disneyplus.com/search?q=[title]
- Max: https://www.max.com/search?q=[title]
- Hulu: https://www.hulu.com/search?q=[title]

**Content availability guidelines:**
- Disney/Marvel/Star Wars content → Disney+
- HBO/Warner Bros content → Max
- NBC/Universal content → Peacock
- Paramount/CBS content → Paramount+
- Most movies → Netflix, Prime Video, Hulu
- Recent releases → Prime Video (rent/buy), Apple TV+

**If no movie or TV show can be identified, respond with:**
{"error": "No movie or TV show found"}`;

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

    console.log(`🔍 Processing query: "${query}"`);
    
    // Check if the query is a URL
    const isUrl = query.trim().match(/^https?:\/\/.+/);
    let contentToAnalyze = query;
    
    if (isUrl) {
      console.log(`🌐 URL detected, fetching content...`);
      contentToAnalyze = await fetchUrlContent(query.trim());
    }
    
    // Identify content using OpenAI
    const identifiedContent = await identifyContent(contentToAnalyze, isUrl ? query : null);
    
    if (!identifiedContent || identifiedContent.length === 0) {
      return new Response(
        JSON.stringify({ results: [] }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Get posters from TMDB for identified content
    const results = await enrichWithPosters(identifiedContent);
    
    console.log(`✅ Returning ${results.length} results`);
    
    return new Response(
      JSON.stringify({ results }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('❌ Error in search-content function:', error);
    
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function fetchUrlContent(url: string): Promise<string> {
  try {
    // Simple HTML fetch without Firecrawl
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      console.log(`❌ Failed to fetch URL: ${response.status}`);
      return url; // Return the URL itself as fallback
    }
    
    const html = await response.text();
    
    // Extract basic information from HTML
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1] : '';
    
    // Extract meta description if available
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    const description = descMatch ? descMatch[1] : '';
    
    // Combine URL, title, and description for context
    return `URL: ${url}\nTitle: ${title}\nDescription: ${description}\n\nPage content (first 2000 chars):\n${html.substring(0, 2000)}`;
  } catch (error) {
    console.log(`⚠️ Error fetching URL content: ${error.message}`);
    return url; // Return URL as fallback
  }
}

async function identifyContent(query: string, originalUrl?: string): Promise<ContentResult[]> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }
  
  try {
    console.log(`🤖 Identifying content with OpenAI...`);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: CONTENT_IDENTIFICATION_PROMPT
          },
          {
            role: 'user',
            content: query
          }
        ],
        max_tokens: 800,
        temperature: 0.1
      }),
    });
    
    if (!response.ok) {
      console.log(`❌ OpenAI API error: ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content;
    
    if (!aiResponse) {
      console.log('❌ Empty response from OpenAI');
      return [];
    }
    
    // Parse the response
    let result;
    try {
      // Clean markdown formatting if present
      let cleanResponse = aiResponse;
      if (cleanResponse.includes('```json')) {
        cleanResponse = cleanResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      }
      result = JSON.parse(cleanResponse);
    } catch (parseError) {
      console.log(`❌ Failed to parse OpenAI response: ${parseError.message}`);
      return [];
    }
    
    if (result.error) {
      console.log(`⚠️ No content identified: ${result.error}`);
      return [];
    }
    
    // Process streaming sources
    const streamingSources: StreamingSource[] = [];
    if (result.streaming_sources && Array.isArray(result.streaming_sources)) {
      for (const source of result.streaming_sources) {
        const serviceId = source.service.toLowerCase().replace(/[^a-z0-9]/g, '');
        const icon = getStreamingServiceIcon(serviceId);
        
        streamingSources.push({
          name: icon.name,
          logo: icon.logo,
          url: source.link || generateSearchUrl(serviceId, result.title),
          type: source.type || 'subscription',
          price: source.price
        });
      }
    }
    
    // If no streaming sources from AI, generate fallback sources
    if (streamingSources.length === 0) {
      streamingSources.push(...generateFallbackSources(result.title));
    }
    
    // Add source service if URL was from a streaming platform
    if (originalUrl) {
      const sourceService = detectStreamingService(originalUrl);
      if (sourceService && !streamingSources.find(s => s.name === sourceService.name)) {
        streamingSources.unshift(sourceService);
      }
    }
    
    return [{
      title: result.title,
      year: parseInt(result.year) || 0,
      type: result.type || 'movie',
      genre: [],
      rating: 0,
      plot: result.plot || 'No plot available',
      poster: '', // Will be filled by TMDB
      streamingSources,
      confidence: result.confidence === 'high' ? 0.95 : 
                  result.confidence === 'medium' ? 0.8 : 0.6,
      releaseDate: result.year ? `${result.year}-01-01` : undefined
    }];
    
  } catch (error) {
    console.error('❌ Error identifying content:', error);
    return [];
  }
}

async function enrichWithPosters(results: ContentResult[]): Promise<ContentResult[]> {
  const tmdbApiKey = Deno.env.get('TMDB_API_KEY');
  
  if (!tmdbApiKey) {
    console.log('⚠️ TMDB API key not configured, returning without posters');
    return results;
  }
  
  for (const result of results) {
    try {
      const searchType = result.type === 'tv' ? 'tv' : 'movie';
      const searchUrl = `https://api.themoviedb.org/3/search/${searchType}?api_key=${tmdbApiKey}&query=${encodeURIComponent(result.title)}`;
      
      console.log(`🖼️ Fetching poster for: ${result.title}`);
      
      const response = await fetch(searchUrl);
      if (!response.ok) continue;
      
      const data = await response.json();
      const tmdbResults = data.results || [];
      
      if (tmdbResults.length > 0) {
        // Find best match by year if available
        let bestMatch = tmdbResults[0];
        if (result.year) {
          const yearMatch = tmdbResults.find((r: any) => {
            const releaseYear = searchType === 'movie' 
              ? r.release_date?.split('-')[0]
              : r.first_air_date?.split('-')[0];
            return parseInt(releaseYear) === result.year;
          });
          if (yearMatch) bestMatch = yearMatch;
        }
        
        if (bestMatch.poster_path) {
          result.poster = `https://image.tmdb.org/t/p/w500${bestMatch.poster_path}`;
          console.log(`✅ Found poster for ${result.title}`);
        }
      }
    } catch (error) {
      console.log(`⚠️ Error fetching poster for ${result.title}: ${error.message}`);
    }
  }
  
  return results;
}

function detectStreamingService(url: string): StreamingSource | null {
  const services = [
    { pattern: /netflix\.com/, id: 'netflix', name: 'Netflix' },
    { pattern: /primevideo\.com|amazon\.com/, id: 'prime', name: 'Prime Video' },
    { pattern: /disneyplus\.com/, id: 'disney', name: 'Disney+' },
    { pattern: /hulu\.com/, id: 'hulu', name: 'Hulu' },
    { pattern: /max\.com|hbomax\.com/, id: 'max', name: 'Max' },
    { pattern: /peacocktv\.com/, id: 'peacock', name: 'Peacock' },
    { pattern: /paramountplus\.com/, id: 'paramount', name: 'Paramount+' },
    { pattern: /apple\.com/, id: 'appletv', name: 'Apple TV+' }
  ];
  
  for (const service of services) {
    if (service.pattern.test(url)) {
      const icon = getStreamingServiceIcon(service.id);
      return {
        name: icon.name,
        logo: icon.logo,
        url: url,
        type: 'subscription'
      };
    }
  }
  
  return null;
}

function generateSearchUrl(serviceId: string, title: string): string {
  const encodedTitle = encodeURIComponent(title);
  
  switch(serviceId) {
    case 'netflix':
      return `https://www.netflix.com/search?q=${encodedTitle}`;
    case 'prime':
    case 'primevideo':
    case 'amazon':
      return `https://www.amazon.com/s?k=${encodedTitle}&i=instant-video`;
    case 'disney':
    case 'disneyplus':
      return `https://www.disneyplus.com/search?q=${encodedTitle}`;
    case 'max':
    case 'hbomax':
      return `https://www.max.com/search?q=${encodedTitle}`;
    case 'hulu':
      return `https://www.hulu.com/search?q=${encodedTitle}`;
    case 'peacock':
      return `https://www.peacocktv.com/search?q=${encodedTitle}`;
    case 'paramount':
    case 'paramountplus':
      return `https://www.paramountplus.com/search?q=${encodedTitle}`;
    case 'appletv':
    case 'apple':
      return `https://tv.apple.com/search?term=${encodedTitle}`;
    default:
      return `https://www.google.com/search?q=${encodedTitle}+streaming`;
  }
}

function generateFallbackSources(title: string): StreamingSource[] {
  const fallbackServices = ['netflix', 'prime', 'disney', 'max', 'hulu'];
  const sources: StreamingSource[] = [];
  
  // Select 2-3 random services
  const selectedServices = fallbackServices
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.floor(Math.random() * 2) + 2);
  
  for (const serviceId of selectedServices) {
    const icon = getStreamingServiceIcon(serviceId);
    sources.push({
      name: icon.name,
      logo: icon.logo,
      url: generateSearchUrl(serviceId, title),
      type: 'subscription'
    });
  }
  
  return sources;
}