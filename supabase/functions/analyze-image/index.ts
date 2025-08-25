import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
  openai: {
    start: (model: string, tokens: number) => {
      console.group(`🤖 OpenAI Vision API`);
      console.log(`📝 Model: ${model}`);
      console.log(`🎯 Max Tokens: ${tokens}`);
      console.log(`📤 Sending request to: https://api.openai.com/v1/chat/completions`);
    },
    success: (responseTime: number, content: string) => {
      console.log(`✅ Response received in ${responseTime}ms`);
      console.log(`📄 Response length: ${content.length} characters`);
      console.log(`🔍 Content preview: ${content.substring(0, 100)}...`);
      console.groupEnd();
    },
    error: (status: number, error: string) => {
      console.log(`❌ API Error - Status: ${status}`);
      console.log(`💭 Error details: ${error}`);
      console.groupEnd();
    }
  },

  tmdb: {
    start: (title: string, year: number, type: string) => {
      console.group(`🎬 TMDB API`);
      console.log(`🔍 Searching: "${title}" (${year})`);
      console.log(`📺 Media Type: ${type}`);
    },
    request: (url: string) => {
      console.log(`📤 Request URL: ${url}`);
    },
    success: (posterPath: string | null, responseTime?: number) => {
      if (responseTime) console.log(`✅ Response received in ${responseTime}ms`);
      if (posterPath) {
        console.log(`🖼️  Poster found: ${posterPath}`);
      } else {
        console.log(`🚫 No poster found`);
      }
      console.groupEnd();
    },
    error: (error: any) => {
      console.log(`❌ TMDB API Error: ${error.message || error}`);
      console.groupEnd();
    }
  },

  streaming: {
    start: (title: string, year: number, type: string) => {
      console.group(`🎭 Streaming Availability API`);
      console.log(`🔍 Searching: "${title}" (${year})`);
      console.log(`📺 Content Type: ${type === 'tv' ? 'series' : 'movie'}`);
    },
    request: (url: string, headers: Record<string, string>) => {
      console.log(`📤 Request URL: ${url}`);
      console.log(`🔑 Using RapidAPI Key: ${headers['X-RapidAPI-Key'] ? 'Yes' : 'No'}`);
    },
    success: (sourcesFound: number, responseTime?: number) => {
      if (responseTime) console.log(`✅ Response received in ${responseTime}ms`);
      console.log(`🎯 Streaming sources found: ${sourcesFound}`);
      console.groupEnd();
    },
    error: (status: number, error: string) => {
      console.log(`❌ API Error - Status: ${status}`);
      console.log(`💭 Error details: ${error}`);
      console.groupEnd();
    },
    noApiKey: () => {
      console.log(`⚠️  No Streaming API key available`);
      console.groupEnd();
    }
  },

  youtube: {
    start: (title: string) => {
      console.group(`📺 YouTube Data API`);
      console.log(`🔍 Searching: "${title}"`);
    },
    searchRequest: (url: string) => {
      console.log(`📤 Search URL: ${url}`);
    },
    detailsRequest: (videoId: string, url: string) => {
      console.log(`📤 Details URL: ${url}`);
      console.log(`🆔 Video ID: ${videoId}`);
    },
    success: (videoTitle: string, channelName: string, responseTime?: number) => {
      if (responseTime) console.log(`✅ Response received in ${responseTime}ms`);
      console.log(`🎥 Video: "${videoTitle}"`);
      console.log(`📺 Channel: ${channelName}`);
      console.groupEnd();
    },
    error: (error: any) => {
      console.log(`❌ YouTube API Error: ${error.message || error}`);
      console.groupEnd();
    },
    noApiKey: () => {
      console.log(`⚠️  No YouTube API key available`);
      console.groupEnd();
    }
  },

  request: {
    start: (operation: string) => {
      console.group(`🚀 ${operation}`);
      console.log(`⏰ Started at: ${new Date().toISOString()}`);
    },
    validation: (contentLength: string | null, imageSize: number) => {
      console.log(`📊 Content-Length header: ${contentLength || 'not provided'}`);
      console.log(`📏 Base64 image size: ${(imageSize / 1024 / 1024).toFixed(2)} MB`);
    },
    end: (resultsCount: number, totalTime: number) => {
      console.log(`🎯 Results found: ${resultsCount}`);
      console.log(`⚡ Total processing time: ${totalTime.toFixed(2)}ms`);
      console.groupEnd();
    }
  }
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const tmdbApiKey = Deno.env.get('TMDB_API_KEY');
const youtubeApiKey = Deno.env.get('YOUTUBE_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DetectedContent {
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

// Fetch poster from TMDB API
const fetchPosterFromTMDB = async (title: string, year: number, type: 'movie' | 'tv' | 'documentary'): Promise<string> => {
  const timer = Logger.startTimer('TMDB API');
  Logger.tmdb.start(title, year, type);

  try {
    // Search for the title on TMDB
    const searchType = type === 'movie' ? 'movie' : 'tv';
    const searchUrl = `https://api.themoviedb.org/3/search/${searchType}?api_key=${tmdbApiKey}&query=${encodeURIComponent(title)}&year=${year}`;
    
    Logger.tmdb.request(searchUrl);
    RawLogger.logRequest('TMDB', 'GET', searchUrl, {});
    
    const searchResponse = await fetch(searchUrl);
    const responseTime = timer.end();
    
    const responseHeaders = Object.fromEntries([...searchResponse.headers.entries()]);
    let searchData;
    
    if (searchResponse.ok) {
      searchData = await searchResponse.json();
      RawLogger.logResponse('TMDB', searchResponse.status, responseHeaders, searchData, responseTime);
    } else {
      const errorText = await searchResponse.text();
      RawLogger.logResponse('TMDB', searchResponse.status, responseHeaders, errorText, responseTime);
      searchData = { results: [] };
    }
    
    if (searchData.results && searchData.results.length > 0) {
      const result = searchData.results[0];
      const posterPath = result.poster_path;
      
      if (posterPath) {
        const fullPosterUrl = `https://image.tmdb.org/t/p/w500${posterPath}`;
        Logger.tmdb.success(fullPosterUrl, responseTime);
        return fullPosterUrl;
      }
    }
    
    Logger.tmdb.success(null, responseTime);
    return "https://images.unsplash.com/photo-1489599904821-6ef46474ebc3?w=300&h=450&fit=crop";
  } catch (error) {
    Logger.tmdb.error(error);
    return "https://images.unsplash.com/photo-1489599904821-6ef46474ebc3?w=300&h=450&fit=crop";
  }
};

// Fetch real streaming data from Streaming Availability API
const fetchStreamingData = async (title: string, year: number, type: 'movie' | 'tv' | 'documentary'): Promise<StreamingSource[]> => {
  const timer = Logger.startTimer('Streaming API');
  const streamingApiKey = Deno.env.get('STREAMING_AVAILABILITY_API_KEY');
  
  Logger.streaming.start(title, year, type);
  
  if (!streamingApiKey) {
    Logger.streaming.noApiKey();
    return [];
  }

  try {
    // Search for the title using the shows/search/title endpoint
    const searchType = type === 'tv' ? 'series' : 'movie';
    const searchUrl = `https://streaming-availability.p.rapidapi.com/shows/search/title?title=${encodeURIComponent(title)}&country=us&show_type=${searchType}&output_language=en`;
    
    const headers = {
      'X-RapidAPI-Key': streamingApiKey,
      'X-RapidAPI-Host': 'streaming-availability.p.rapidapi.com'
    };
    
    Logger.streaming.request(searchUrl, headers);
    RawLogger.logRequest('Streaming Availability', 'GET', searchUrl, headers);
    
    const searchResponse = await fetch(searchUrl, {
      method: 'GET',
      headers
    });

    const responseTime = timer.end();
    const responseHeaders = Object.fromEntries([...searchResponse.headers.entries()]);

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      RawLogger.logResponse('Streaming Availability', searchResponse.status, responseHeaders, errorText, responseTime);
      Logger.streaming.error(searchResponse.status, errorText);
      return [];
    }

    const searchData = await searchResponse.json();
    RawLogger.logResponse('Streaming Availability', searchResponse.status, responseHeaders, searchData, responseTime);
    console.log(`📊 Raw results count: ${searchData?.length || 0}`);

    // Find the matching title and year
    let matchedShow = null;
    if (searchData && searchData.length > 0) {
      matchedShow = searchData.find((show: any) => {
        const showYear = show.firstAirYear || show.releaseYear;
        return Math.abs(showYear - year) <= 1; // Allow 1 year difference
      }) || searchData[0]; // Fallback to first result
      
      console.log(`🎯 Best match: ${matchedShow.title} (${matchedShow.releaseYear || matchedShow.firstAirYear})`);
    }

    if (!matchedShow) {
      Logger.streaming.success(0, responseTime);
      return [];
    }

    // Extract streaming sources from the matched show
    const streamingSources: StreamingSource[] = [];
    
    if (matchedShow.streamingOptions && matchedShow.streamingOptions.us) {
      for (const option of matchedShow.streamingOptions.us) {
        const service = option.service;
        console.log(`📺 Adding source: ${service.name} (${option.type})`);
        
        const streamingSource: StreamingSource = {
          name: service.name,
          logo: service.imageSet?.lightThemeImage || `https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=40&h=40&fit=crop`,
          url: option.link,
          type: option.type === 'subscription' ? 'subscription' : 
                option.type === 'rent' ? 'rent' : 
                option.type === 'buy' ? 'buy' : 'free',
          price: option.price ? `$${option.price.amount}` : undefined
        };
        streamingSources.push(streamingSource);
      }
    }

    Logger.streaming.success(streamingSources.length, responseTime);
    return streamingSources;

  } catch (error) {
    Logger.streaming.error(0, error.message || error);
    return [];
  }
};

// Fetch real YouTube video data using YouTube Data API
const fetchYouTubeData = async (videoTitle: string): Promise<{ thumbnail: string; url: string; channelName: string; actualTitle: string } | null> => {
  const timer = Logger.startTimer('YouTube API');
  Logger.youtube.start(videoTitle);
  
  if (!youtubeApiKey) {
    Logger.youtube.noApiKey();
    return null;
  }

  try {
    // Search for videos using YouTube Data API v3
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(videoTitle)}&type=video&maxResults=5&key=${youtubeApiKey}`;
    
    Logger.youtube.searchRequest(searchUrl);
    RawLogger.logRequest('YouTube Data API', 'GET', searchUrl, {});
    
    const searchResponse = await fetch(searchUrl);
    const searchResponseHeaders = Object.fromEntries([...searchResponse.headers.entries()]);
    
    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      RawLogger.logResponse('YouTube Data API', searchResponse.status, searchResponseHeaders, errorText, 0);
      Logger.youtube.error({ message: `Search failed: ${searchResponse.status} - ${errorText}` });
      return null;
    }

    const searchData = await searchResponse.json();
    RawLogger.logResponse('YouTube Data API', searchResponse.status, searchResponseHeaders, searchData, 0);
    console.log(`📊 Search results: ${searchData.items?.length || 0} videos found`);
    
    if (!searchData.items || searchData.items.length === 0) {
      Logger.youtube.error({ message: 'No videos found for query' });
      return null;
    }

    // Get the first result (most relevant)
    const video = searchData.items[0];
    const videoId = video.id.videoId;
    console.log(`🎯 Selected video ID: ${videoId}`);
    
    // Get video details including higher quality thumbnail
    const videoDetailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${youtubeApiKey}`;
    Logger.youtube.detailsRequest(videoId, videoDetailsUrl);
    RawLogger.logRequest('YouTube Data API', 'GET', videoDetailsUrl, {});
    
    const detailsResponse = await fetch(videoDetailsUrl);
    const responseTime = timer.end();
    const detailsResponseHeaders = Object.fromEntries([...detailsResponse.headers.entries()]);
    
    if (!detailsResponse.ok) {
      const errorText = await detailsResponse.text();
      RawLogger.logResponse('YouTube Data API', detailsResponse.status, detailsResponseHeaders, errorText, responseTime);
      console.log(`⚠️  Video details failed (${detailsResponse.status}), using search result data`);
      // Fallback to search result data
      const fallbackData = {
        thumbnail: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.medium?.url || video.snippet.thumbnails.default?.url,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        channelName: video.snippet.channelTitle,
        actualTitle: video.snippet.title
      };
      Logger.youtube.success(fallbackData.actualTitle, fallbackData.channelName, responseTime);
      return fallbackData;
    }

    const detailsData = await detailsResponse.json();
    RawLogger.logResponse('YouTube Data API', detailsResponse.status, detailsResponseHeaders, detailsData, responseTime);
    const videoDetails = detailsData.items[0];
    
    if (!videoDetails) {
      Logger.youtube.error({ message: `No details found for video ID: ${videoId}` });
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

    Logger.youtube.success(result.actualTitle, result.channelName, responseTime);
    return result;

  } catch (error) {
    Logger.youtube.error(error);
    return null;
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestTimer = Logger.startTimer('Total Request');
  Logger.request.start('Image Analysis Request');

  try {
    // Server-side validation
    const contentLength = req.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
      console.log('❌ Request too large:', contentLength);
      return new Response(JSON.stringify({ error: 'File too large. Maximum size is 10MB.' }), {
        status: 413,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { imageBase64, mimeType } = await req.json();

    // Validate image data
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      console.log('❌ Invalid image data provided');
      return new Response(JSON.stringify({ error: 'Invalid image data provided.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate MIME type
    const validMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const actualMimeType = mimeType && validMimeTypes.includes(mimeType) ? mimeType : 'image/jpeg';
    console.log(`📸 Image MIME type: ${actualMimeType}`);

    // Validate base64 format and size
    if (imageBase64.length > 14 * 1024 * 1024) { // ~10MB when base64 encoded
      console.log('❌ Image too large:', (imageBase64.length / 1024 / 1024).toFixed(2), 'MB');
      return new Response(JSON.stringify({ error: 'Image too large. Maximum size is 10MB.' }), {
        status: 413,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate base64 string format
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    if (!base64Regex.test(imageBase64)) {
      console.log('❌ Invalid base64 format');
      return new Response(JSON.stringify({ error: 'Invalid base64 image format.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check for minimum base64 length (a 1x1 pixel image would be ~100+ chars)
    if (imageBase64.length < 100) {
      console.log('❌ Base64 data too short:', imageBase64.length, 'characters');
      return new Response(JSON.stringify({ error: 'Image data appears to be incomplete or corrupted.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    Logger.request.validation(contentLength, imageBase64.length);
    console.log(`✅ Base64 validation passed: ${imageBase64.length} characters, MIME type: ${actualMimeType}`);

    const openaiTimer = Logger.startTimer('OpenAI Vision');
    Logger.openai.start('gpt-4o', 1000);

    const requestBody = {
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an expert at identifying movies, TV shows, documentaries, and YouTube videos from images with exceptional accuracy.
          
          Your task is to analyze images and identify all visible media content with precise details.
          
          CRITICAL ANALYSIS GUIDELINES:
          1. Look for ALL visual cues: titles, logos, actor faces, scenes, UI elements, posters, thumbnails
          2. Identify multiple items if present (e.g., search results, recommendation lists, multiple posters)
          3. Distinguish between similar titles carefully (e.g., "Chief of War" vs "Super Chief")
          4. For franchises, identify the EXACT installment (e.g., "Jurassic World Dominion" not just "Jurassic World")
          5. For TV shows, identify if it's a specific season or episode if visible
          6. For YouTube content, look for channel names, view counts, upload dates, video duration
          7. Check for streaming platform interfaces (Netflix, Prime Video, Hulu, etc.)
          8. Notice release years, especially for remakes or reboots
          9. Identify documentaries by their documentary-style presentation
          10. Include upcoming/unreleased content (2024-2025+) based on promotional materials
          
          ACCURACY REQUIREMENTS:
          - Be VERY specific with titles - exact wording matters
          - If you see "The Life and Legacy of Earl Warren" - that's the exact title
          - If you see actors/actresses, use that to help identify the content
          - Consider the context - is this a streaming service browse page? Search results? A TV screen?
          - Look for subtitle text that might indicate episode names or additional context
          
          Return a JSON array with this EXACT structure:
          [{
            "title": "exact title as shown",
            "year": year_number,
            "type": "movie" | "tv" | "documentary" | "youtube",
            "genre": ["genre1", "genre2"],
            "rating": 7.5,
            "runtime": "120 min" or "45 min" for TV episodes,
            "plot": "detailed description based on what you can see",
            "poster": "placeholder",
            "confidence": confidence_score_0_to_1,
            "youtubeUrl": "if youtube video",
            "channelName": "if youtube video"
          }]
          
          CONFIDENCE SCORING:
          - 0.95-1.0: Title clearly visible and fully readable
          - 0.85-0.94: Title mostly visible with high certainty
          - 0.75-0.84: Strong visual match but some ambiguity
          - 0.65-0.74: Reasonable guess based on visual elements
          - 0.6-0.64: Educated guess with some uncertainty
          - Below 0.6: Do not include
          
          If multiple items are visible, return ALL of them sorted by confidence.
          If nothing identifiable, return empty array []`
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Carefully analyze this image and identify ALL movies, TV shows, documentaries, or YouTube videos visible. 
              
              Pay special attention to:
              - Any text/titles visible in the image
              - The user interface (is this a streaming service, YouTube, etc?)
              - Multiple items if this is a list or search results
              - Distinguish between similar titles
              - Look for season/episode information for TV shows
              - Notice if items are marked as "new" or have release years
              
              Be as accurate and specific as possible with titles.`
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${actualMimeType};base64,${imageBase64}`
              }
            }
          ]
        }
      ],
      max_tokens: 1000
    };

    const requestHeaders = {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    };

    RawLogger.logRequest('OpenAI', 'POST', 'https://api.openai.com/v1/chat/completions', requestHeaders, {
      ...requestBody,
      messages: requestBody.messages.map(msg => {
        if (msg.content && Array.isArray(msg.content)) {
          return {
            ...msg,
            content: msg.content.map(item => 
              item.type === 'image_url' 
                ? { ...item, image_url: { url: `data:${actualMimeType};base64,${imageBase64.substring(0, 100)}...[BASE64_TRUNCATED_${imageBase64.length}_CHARS]` } }
                : item
            )
          };
        }
        return msg;
      })
    });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify(requestBody),
    });

    const openaiResponseTime = openaiTimer.end();

    if (!response.ok) {
      const error = await response.text();
      const responseHeaders = Object.fromEntries([...response.headers.entries()]);
      RawLogger.logResponse('OpenAI', response.status, responseHeaders, error, openaiResponseTime);
      Logger.openai.error(response.status, error);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    const responseHeaders = Object.fromEntries([...response.headers.entries()]);
    RawLogger.logResponse('OpenAI', response.status, responseHeaders, data, openaiResponseTime);
    
    Logger.openai.success(openaiResponseTime, content);

    let detectedContent: DetectedContent[];
    
    console.group('📋 Parsing OpenAI Response');
    try {
      // Clean the response - remove markdown code blocks if present
      let cleanContent = content.trim();
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/^```json\n?/, '').replace(/\n?```$/, '');
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/^```\n?/, '').replace(/\n?```$/, '');
      }
      
      console.log(`📝 Cleaned content length: ${cleanContent.length} characters`);
      
      // Try to parse the JSON response
      const parsed = JSON.parse(cleanContent);
      detectedContent = Array.isArray(parsed) ? parsed : [parsed];
      console.log(`✅ Successfully parsed ${detectedContent.length} detected items`);
      console.groupEnd();
    } catch (parseError) {
      console.log(`❌ Failed to parse JSON: ${parseError.message}`);
      console.log(`🔍 Raw content preview: ${content.substring(0, 200)}...`);
      console.groupEnd();
      // Return empty array if parsing fails
      detectedContent = [];
    }

    console.group('🔄 Processing Detected Content');
    console.log(`📊 Processing ${detectedContent.length} items...`);

    // Add streaming sources and fetch real posters for each detected item
    const results = await Promise.all(detectedContent.map(async (item, index) => {
      console.group(`📺 Item ${index + 1}/${detectedContent.length}: ${item.title}`);
      console.log(`🎭 Type: ${item.type}`);
      console.log(`📅 Year: ${item.year}`);
      console.log(`🎯 Confidence: ${item.confidence}`);

      if (item.type === 'youtube') {
        // For YouTube videos, fetch real video data using YouTube API
        const youtubeData = await fetchYouTubeData(item.title);
        
        if (youtubeData) {
          console.log(`✅ YouTube data retrieved successfully`);
          console.groupEnd();
          return {
            ...item,
            title: youtubeData.actualTitle, // Use the actual video title from YouTube
            poster: youtubeData.thumbnail,
            streamingSources: [],
            releaseDate: `${item.year}`,
            youtubeUrl: youtubeData.url,
            channelName: youtubeData.channelName
          };
        } else {
          console.log(`⚠️  Using fallback YouTube data`);
          console.groupEnd();
          // Fallback if YouTube API fails
          return {
            ...item,
            poster: item.poster || "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=300&h=450&fit=crop",
            streamingSources: [],
            releaseDate: `${item.year}`,
            youtubeUrl: item.youtubeUrl || `https://youtube.com/results?search_query=${encodeURIComponent(item.title)}`,
            channelName: item.channelName || ''
          };
        }
      } else {
        // For movies/TV/documentaries, fetch TMDB poster and streaming sources
        console.log(`🔄 Fetching poster and streaming data in parallel...`);
        const [poster, streamingSources] = await Promise.all([
          fetchPosterFromTMDB(item.title, item.year, item.type as 'movie' | 'tv' | 'documentary'),
          fetchStreamingData(item.title, item.year, item.type as 'movie' | 'tv' | 'documentary')
        ]);
        
        console.log(`✅ Content processing complete - ${streamingSources.length} streaming sources found`);
        console.groupEnd();
        
        return {
          ...item,
          poster,
          streamingSources,
          releaseDate: `${item.year}`
        };
      }
    }));

    console.groupEnd();

    const totalTime = requestTimer.end();
    Logger.request.end(results.length, totalTime);

    console.log(`🎉 Request completed successfully with ${results.length} results`);

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const totalTime = requestTimer.end();
    console.group('💥 Error in analyze-image function');
    console.log(`❌ Error: ${error.message}`);
    console.log(`⏱️  Request duration: ${totalTime.toFixed(2)}ms`);
    console.log(`📍 Stack trace:`, error.stack);
    console.groupEnd();
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        results: [] 
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});