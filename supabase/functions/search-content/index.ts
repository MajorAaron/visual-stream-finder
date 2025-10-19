import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StreamingSource {
  name: string;
  url: string;
  type: 'subscription' | 'rent' | 'buy' | 'free';
  price?: string;
}

interface ContentResult {
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
  // YouTube specific fields
  youtubeUrl?: string;
  channelName?: string;
}

// Single unified prompt for OpenAI content identification
const CONTENT_IDENTIFICATION_PROMPT = `You are a media identification expert. Analyze the provided text input and identify what movie, TV show, documentary, or YouTube video is being referenced.

**Your task:**
- Parse the text for clues like titles, URLs, plot descriptions, character names, or service listings
- Identify the specific movie, TV show, documentary, or YouTube video
- Handle partial information, typos, or ambiguous references
- Provide your best match even with incomplete information
- For YouTube content, look for channel names, video titles, upload dates, view counts
- For streaming content, find and provide deep link URLs to the show/movie on streaming platforms

**Response format (JSON only):**
{
  "title": "[Movie/Show/Video name]",
  "type": "[movie/tv/documentary/youtube]",
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

**If no content can be identified, respond with:**
{"error": "No content found"}`;

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

    console.log(`[Request] 🔍 Processing query: "${query}"`);
    
    // Check if the query is a URL
    const isUrl = query.trim().match(/^https?:\/\/.+/);
    let contentToAnalyze = query;
    
    if (isUrl) {
      console.log(`[Extract] 🌐 URL detected, fetching content...`);
      contentToAnalyze = await fetchUrlContent(query.trim());
    }
    
    // Check if it's a YouTube URL
    const isYouTubeUrl = query.trim().match(/youtube\.com|youtu\.be/);
    if (isYouTubeUrl) {
      console.log(`[YouTube] 🎥 YouTube URL detected, processing with YouTube Data API...`);

      // Try deterministic metadata fetch via YouTube Data API
      try {
        const videoId = extractYouTubeVideoId(query.trim());
        if (videoId) {
          const ytMeta = await fetchYouTubeMetadata(videoId);
          if (ytMeta) {
            const youtubeResult: ContentResult = {
              title: ytMeta.title,
              year: new Date().getFullYear(),
              type: 'youtube',
              genre: [],
              rating: 0,
              plot: ytMeta.description || '',
              poster: ytMeta.thumbnailUrl || '',
              streamingSources: [],
              confidence: 0.95,
              releaseDate: ytMeta.publishedAt || 'Unknown-01-01',
              youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
              channelName: ytMeta.channelTitle || undefined,
            };

            return new Response(
              JSON.stringify({ results: [youtubeResult] }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
      } catch (ytError) {
        console.log(`[YouTube] ⚠️ Failed deterministic YouTube processing: ${ytError instanceof Error ? ytError.message : String(ytError)}`);
        // Fall through to generic processing below
      }

      console.log(`[YouTube] ℹ️ Falling back to generic processing`);
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
    
    // Get real streaming data from Streaming Availability API
    const finalResults = await enrichWithStreamingData(results);
    
    console.log(`[Response] ✅ Returning ${finalResults.length} results`);
    
    return new Response(
      JSON.stringify({ results: finalResults }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('[Error] ❌ Error in search-content function:', error);
    
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function extractYouTubeVideoId(url: string): string | null {
  // Support full and short forms
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,          // https://www.youtube.com/watch?v=VIDEOID
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,    // https://youtu.be/VIDEOID
    /embed\/([a-zA-Z0-9_-]{11})/,         // https://www.youtube.com/embed/VIDEOID
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m && m[1]) return m[1];
  }
  return null;
}

async function fetchYouTubeMetadata(videoId: string): Promise<{
  title: string;
  channelTitle?: string;
  description?: string;
  thumbnailUrl?: string;
  publishedAt?: string;
} | null> {
  const apiKey = Deno.env.get('YOUTUBE_API_KEY');
  if (!apiKey) {
    console.log('[YouTube] ❌ Missing YOUTUBE_API_KEY');
    return null;
  }
  const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`;
  const resp = await fetch(url);
  if (!resp.ok) {
    console.log(`[YouTube] ❌ API error: ${resp.status}`);
    return null;
  }
  const data = await resp.json();
  const item = data.items?.[0];
  if (!item) return null;
  const snippet = item.snippet || {};
  const thumbs = snippet.thumbnails || {};
  const thumbUrl =
    thumbs.maxres?.url ||
    thumbs.high?.url ||
    thumbs.medium?.url ||
    thumbs.default?.url || '';
  return {
    title: snippet.title || 'YouTube Video',
    channelTitle: snippet.channelTitle,
    description: snippet.description,
    thumbnailUrl: thumbUrl,
    publishedAt: snippet.publishedAt,
  };
}

async function fetchUrlContent(url: string): Promise<string> {
  try {
    // Simple HTML fetch without Firecrawl
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      console.log(`[Extract] ❌ Failed to fetch URL: ${response.status}`);
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
    console.log(`[Extract] ⚠️ Error fetching URL content: ${error.message}`);
    return url; // Return URL as fallback
  }
}

async function identifyContent(query: string, originalUrl?: string): Promise<ContentResult[]> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }
  
  try {
    console.log(`[OpenAI] 🤖 Identifying content with OpenAI...`);
    
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
      console.log(`[OpenAI] ❌ API error: ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content;
    
    if (!aiResponse) {
      console.log('[OpenAI] ❌ Empty response from OpenAI');
      return [];
    }
    
    // Parse the response
    let result;
    try {
      // Clean markdown formatting if present
      let cleanResponse = aiResponse;
      if (cleanResponse.includes('```json')) {
        cleanResponse = cleanResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (cleanResponse.includes('```')) {
        cleanResponse = cleanResponse.replace(/```\n?/g, '');
      }
      
      // Additional cleanup for any remaining markdown
      cleanResponse = cleanResponse.trim();
      
      console.log(`[Parse] 📝 Attempting to parse: ${cleanResponse.substring(0, 200)}...`);
      result = JSON.parse(cleanResponse);
    } catch (parseError) {
      console.log(`[Parse] ❌ Failed to parse OpenAI response: ${parseError.message}`);
      console.log(`[Parse] 📝 Raw response was: ${aiResponse}`);
      return [];
    }
    
    if (result.error) {
      console.log(`[Parse] ⚠️ No content identified: ${result.error}`);
      return [];
    }
    
    // Process streaming sources
    console.log(`[Streaming] 📊 Processing ${result.streaming_sources?.length || 0} streaming sources from OpenAI`);
    const streamingSources: StreamingSource[] = [];
    if (result.streaming_sources && Array.isArray(result.streaming_sources)) {
      for (const source of result.streaming_sources) {
        const serviceId = source.service.toLowerCase().replace(/[^a-z0-9]/g, '');
        
        streamingSources.push({
          name: source.service,
          url: source.link || generateSearchUrl(serviceId, result.title),
          type: source.type || 'subscription',
          price: source.price
        });
      }
    }
    
    // If no streaming sources from AI, generate fallback sources
    if (streamingSources.length === 0) {
      console.log(`[Streaming] 🔄 No sources from OpenAI, generating fallback sources`);
      streamingSources.push(...generateFallbackSources(result.title));
    }
    
    // Add source service if URL was from a streaming platform
    if (originalUrl) {
      const sourceService = detectStreamingService(originalUrl);
      if (sourceService && !streamingSources.find(s => s.name === sourceService.name)) {
        console.log(`[Streaming] 🎯 Adding detected source service: ${sourceService.name}`);
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
    console.error('[OpenAI] ❌ Error identifying content:', error);
    return [];
  }
}

async function enrichWithPosters(results: ContentResult[]): Promise<ContentResult[]> {
  const tmdbApiKey = Deno.env.get('TMDB_API_KEY');
  
  if (!tmdbApiKey) {
    console.log('[TMDB] ⚠️ API key not configured, returning without posters');
    return results;
  }
  
  for (const result of results) {
    try {
      const searchType = result.type === 'tv' ? 'tv' : 'movie';
      const searchUrl = `https://api.themoviedb.org/3/search/${searchType}?api_key=${tmdbApiKey}&query=${encodeURIComponent(result.title)}`;
      
      console.log(`[TMDB] 🖼️ Fetching poster for: ${result.title}`);
      
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
          console.log(`[TMDB] ✅ Found poster for ${result.title}`);
        }
      }
    } catch (error) {
      console.log(`[TMDB] ⚠️ Error fetching poster for ${result.title}: ${error.message}`);
    }
  }
  
  return results;
}

async function enrichWithStreamingData(results: ContentResult[]): Promise<ContentResult[]> {
  for (const result of results) {
    if (result.type === 'youtube') {
      // For YouTube content, fetch real video data using YouTube API
      console.log(`[YouTube] 🎥 Processing YouTube content: ${result.title}`);
      const youtubeData = await fetchYouTubeData(result.title);
      
      if (youtubeData) {
        console.log(`[YouTube] ✅ YouTube data retrieved successfully`);
        result.title = youtubeData.actualTitle; // Use the actual video title from YouTube
        result.poster = youtubeData.thumbnail;
        result.streamingSources = [];
        result.youtubeUrl = youtubeData.url;
        result.channelName = youtubeData.channelName;
      } else {
        console.log(`[YouTube] ⚠️ Using fallback YouTube data`);
        // Fallback if YouTube API fails
        result.poster = result.poster || "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=300&h=450&fit=crop";
        result.streamingSources = [];
        result.youtubeUrl = `https://youtube.com/results?search_query=${encodeURIComponent(result.title)}`;
        result.channelName = result.channelName || '';
      }
    } else {
      // For movies/TV/documentaries, fetch streaming data from Streaming Availability API
      const streamingAvailabilityApiKey = Deno.env.get('STREAMING_AVAILABILITY_API_KEY');
      
      if (!streamingAvailabilityApiKey) {
        console.log('[Streaming Availability] ⚠️ API key not configured, returning without streaming data');
        continue;
      }

      try {
        const searchType = result.type === 'tv' ? 'series' : 'movie';
        const searchUrl = `https://streaming-availability.p.rapidapi.com/shows/search/title?title=${encodeURIComponent(result.title)}&country=us&show_type=${searchType}&output_language=en`;
        
        console.log(`[Streaming Availability] 🔗 Fetching streaming data for: ${result.title}`);
        
        const headers = {
          'X-RapidAPI-Key': streamingAvailabilityApiKey,
          'X-RapidAPI-Host': 'streaming-availability.p.rapidapi.com'
        };
        
        const response = await fetch(searchUrl, {
          method: 'GET',
          headers
        });
        
        if (!response.ok) {
          console.log(`[Streaming Availability] ❌ Failed to fetch streaming data for ${result.title}: ${response.status}`);
          continue;
        }

        const searchData = await response.json();
        console.log(`📊 Raw streaming results count: ${searchData?.length || 0}`);

        // Find the matching title and year
        let matchedShow: any = null;
        if (searchData && searchData.length > 0) {
          matchedShow = searchData.find((show: any) => {
            const showYear = show.firstAirYear || show.releaseYear;
            return Math.abs(showYear - result.year) <= 1; // Allow 1 year difference
          }) || searchData[0]; // Fallback to first result
          
          console.log(`🎯 Best streaming match: ${matchedShow.title} (${matchedShow.releaseYear || matchedShow.firstAirYear})`);
        }

        if (!matchedShow) {
          console.log(`[Streaming Availability] ⚠️ No streaming match found for ${result.title}`);
          continue;
        }

        // Extract streaming sources from the matched show
        const streamingSources: StreamingSource[] = [];
        
        if (matchedShow.streamingOptions && matchedShow.streamingOptions.us) {
          for (const option of matchedShow.streamingOptions.us) {
            const service = option.service;
            console.log(`📺 Adding streaming source: ${service.name} (${option.type})`);
            
            const streamingSource: StreamingSource = {
              name: service.name,
              url: option.link, // This is the deep link from the API
              type: option.type === 'subscription' ? 'subscription' : 
                    option.type === 'rent' ? 'rent' : 
                    option.type === 'buy' ? 'buy' : 'free',
              price: option.price ? `$${option.price.amount}` : undefined
            };
            streamingSources.push(streamingSource);
          }
        }

        // If no streaming sources found, generate fallback sources
        if (streamingSources.length === 0) {
          console.log(`[Streaming Availability] 🔄 No sources found, generating fallback sources for ${result.title}`);
          streamingSources.push(...generateFallbackSources(result.title));
        }

        result.streamingSources = streamingSources;
        console.log(`[Streaming Availability] ✅ Found ${streamingSources.length} streaming sources for ${result.title}`);

        // Additionally, attempt to fetch a YouTube trailer link for previews
        try {
          const trailerQuery = `${result.title} ${result.year || ''} official trailer`.trim();
          const trailerData = await fetchYouTubeData(trailerQuery);
          if (trailerData?.url) {
            result.youtubeUrl = trailerData.url;
            result.channelName = trailerData.channelName;
            console.log(`[YouTube] 🎬 Trailer found for ${result.title}`);
          } else {
            console.log(`[YouTube] ⚠️ No trailer found for ${result.title}`);
          }
        } catch (ytErr) {
          console.log(`[YouTube] ⚠️ Error fetching trailer for ${result.title}: ${ytErr instanceof Error ? ytErr.message : String(ytErr)}`);
        }

      } catch (error) {
        console.log(`[Streaming Availability] ⚠️ Error fetching streaming data for ${result.title}: ${error.message}`);
        // Generate fallback sources on error
        result.streamingSources = generateFallbackSources(result.title);
        // Best-effort trailer fetch even if streaming API failed
        try {
          const trailerQuery = `${result.title} ${result.year || ''} official trailer`.trim();
          const trailerData = await fetchYouTubeData(trailerQuery);
          if (trailerData?.url) {
            result.youtubeUrl = trailerData.url;
            result.channelName = trailerData.channelName;
          }
        } catch (trailerErr) {
          console.log(`[YouTube] ⚠️ Trailer fetch fallback error for ${result.title}: ${trailerErr instanceof Error ? trailerErr.message : String(trailerErr)}`);
        }
      }
    }
  }

  return results;
}

// Fetch real YouTube video data using YouTube Data API
async function fetchYouTubeData(videoTitle: string): Promise<{ thumbnail: string; url: string; channelName: string; actualTitle: string } | null> {
  const youtubeApiKey = Deno.env.get('YOUTUBE_API_KEY');
  
  if (!youtubeApiKey) {
    console.log('[YouTube] ⚠️ API key not configured');
    return null;
  }

  try {
    console.log(`[YouTube] 🎥 Fetching data for: ${videoTitle}`);
    
    // Search for videos using YouTube Data API v3
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(videoTitle)}&type=video&maxResults=5&key=${youtubeApiKey}`;
    
    const searchResponse = await fetch(searchUrl);
    
    if (!searchResponse.ok) {
      console.log(`[YouTube] ❌ Search failed: ${searchResponse.status}`);
      return null;
    }

    const searchData = await searchResponse.json();
    console.log(`📊 YouTube search results: ${searchData.items?.length || 0} videos found`);
    
    if (!searchData.items || searchData.items.length === 0) {
      console.log('[YouTube] ⚠️ No videos found for query');
      return null;
    }

    // Get the first result (most relevant)
    const video = searchData.items[0];
    const videoId = video.id.videoId;
    console.log(`🎯 Selected video ID: ${videoId}`);
    
    // Get video details including higher quality thumbnail
    const videoDetailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${youtubeApiKey}`;
    
    const detailsResponse = await fetch(videoDetailsUrl);
    
    if (!detailsResponse.ok) {
      console.log(`⚠️ Video details failed (${detailsResponse.status}), using search result data`);
      // Fallback to search result data
      const fallbackData = {
        thumbnail: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.medium?.url || video.snippet.thumbnails.default?.url,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        channelName: video.snippet.channelTitle,
        actualTitle: video.snippet.title
      };
      console.log(`[YouTube] ✅ Using fallback data for ${fallbackData.actualTitle}`);
      return fallbackData;
    }

    const detailsData = await detailsResponse.json();
    const videoDetails = detailsData.items[0];
    
    if (!videoDetails) {
      console.log(`[YouTube] ❌ No details found for video ID: ${videoId}`);
      return null;
    }

    const result = {
      thumbnail: videoDetails.snippet.thumbnails.maxres?.url || 
                videoDetails.snippet.thumbnails.high?.url || 
                videoDetails.snippet.thumbnails.medium?.url || 
                videoDetails.snippet.thumbnails.default?.url,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      channelName: videoDetails.snippet.channelTitle,
      actualTitle: videoDetails.snippet.title
    };

    console.log(`[YouTube] ✅ Successfully fetched data for ${result.actualTitle}`);
    return result;

  } catch (error) {
    console.log(`[YouTube] ❌ Error: ${error.message}`);
    return null;
  }
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
      return {
        name: service.name,
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
    const serviceName = getServiceName(serviceId);
    sources.push({
      name: serviceName,
      url: generateSearchUrl(serviceId, title),
      type: 'subscription'
    });
  }
  
  return sources;
}

function getServiceName(serviceId: string): string {
  const serviceNames: { [key: string]: string } = {
    'netflix': 'Netflix',
    'prime': 'Prime Video',
    'disney': 'Disney+',
    'hulu': 'Hulu',
    'max': 'Max',
    'appletv': 'Apple TV+',
    'peacock': 'Peacock',
    'paramount': 'Paramount+'
  };
  return serviceNames[serviceId] || serviceId;
}
