import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';
import { getStreamingServiceIcon } from '../streaming-icons.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Feature flags
const ENABLE_STREAMING_AVAILABILITY_API = true; // Enabled for real deep links to streaming platforms
const ENABLE_CACHING = false; // DISABLED for development - no more waiting for cache to expire!
const ENABLE_CLAUDE_VISION = true; // Use Claude for image analysis (more accurate OCR)
const CLAUDE_MODEL = 'claude-sonnet-4-5-20250514'; // Claude Sonnet for excellent vision + OCR

// Initialize Supabase client for cache access
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface SearchInput {
  imageBase64?: string;
  mimeType?: string;
  query?: string;
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
  youtubeUrl?: string;
  channelName?: string;
  tmdbId?: number; // For fetching watch providers
  imdbId?: string; // For IMDB fallback link
}

interface StreamingSource {
  name: string;
  logo: string;
  url: string;
  type: 'subscription' | 'rent' | 'buy' | 'free' | 'aggregator';
  price?: string;
}

// Utility: Generate SHA256 hash for cache keys
async function generateHash(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Utility: Retry with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      const delay = initialDelay * Math.pow(2, i);
      console.log(`[Retry] Attempt ${i + 1} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('All retries failed');
}

// Utility: Calculate Levenshtein distance for title matching
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

// Utility: Normalize title for comparison (lowercase, remove special chars)
function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

// Utility: Calculate title similarity score (0-1, higher is better)
function calculateTitleSimilarity(title1: string, title2: string): number {
  const normalized1 = normalizeTitle(title1);
  const normalized2 = normalizeTitle(title2);

  if (normalized1 === normalized2) return 1.0;

  // Check if one contains the other (handles "Tom Segura: Teacher" vs "Tom Segura Teacher")
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
    const longer = normalized1.length > normalized2.length ? normalized1 : normalized2;
    const shorter = normalized1.length > normalized2.length ? normalized2 : normalized1;
    return shorter.length / longer.length * 0.95; // High score for containment
  }

  const maxLen = Math.max(normalized1.length, normalized2.length);
  if (maxLen === 0) return 1.0;

  const distance = levenshteinDistance(normalized1, normalized2);
  return Math.max(0, 1 - (distance / maxLen));
}

// Layer 1: Cache lookup
async function checkCache(hash: string): Promise<ContentResult | null> {
  if (!ENABLE_CACHING) {
    console.log(`[Cache] ⏭️  Cache DISABLED for development`);
    return null;
  }

  console.log(`[Cache] 🔍 Looking up hash: ${hash.substring(0, 16)}...`);

  try {
    const { data, error } = await supabase
      .from('search_cache')
      .select('*')
      .eq('input_hash', hash)
      .single();

    if (error || !data) {
      console.log(`[Cache] ❌ Cache miss`);
      return null;
    }

    // Update access time and hit count
    await supabase
      .from('search_cache')
      .update({
        last_accessed_at: new Date().toISOString(),
        hit_count: data.hit_count + 1
      })
      .eq('input_hash', hash);

    console.log(`[Cache] ✅ Cache HIT! (${data.hit_count + 1} total hits)`);

    // Reconstruct result from cache
    const cachedType = data.identified_type || 'movie';
    return {
      title: data.identified_title,
      year: data.identified_year || 0,
      type: cachedType,
      genre: data.genre || [],
      rating: data.rating || 0,
      runtime: data.runtime,
      plot: data.plot || '',
      poster: data.tmdb_poster_url || '',
      streamingSources: await generateSmartStreamingLinks(
        data.identified_title,
        data.identified_year,
        data.tmdb_id,
        cachedType === 'documentary' ? 'movie' : cachedType as 'movie' | 'tv',
        data.imdb_id || undefined
      ),
      imdbId: data.imdb_id || undefined,
      confidence: data.confidence || 0.9,
      releaseDate: data.release_date,
      youtubeUrl: data.youtube_url,
      channelName: data.channel_name,
      tmdbId: data.tmdb_id
    };
  } catch (error) {
    console.log(`[Cache] ⚠️  Cache lookup error: ${error.message}`);
    return null;
  }
}

// Layer 1: Store in cache
async function storeInCache(hash: string, contentType: string, result: ContentResult): Promise<void> {
  if (!ENABLE_CACHING) {
    console.log(`[Cache] ⏭️  Cache storage DISABLED for development`);
    return;
  }

  console.log(`[Cache] 💾 Storing result for: ${result.title}`);

  try {
    const { error } = await supabase
      .from('search_cache')
      .upsert({
        input_hash: hash,
        content_type: contentType,
        identified_title: result.title,
        identified_year: result.year,
        identified_type: result.type,
        tmdb_id: result.tmdbId,  // Store TMDB ID for watch providers!
        imdb_id: result.imdbId,  // Store IMDB ID for fallback link!
        tmdb_poster_url: result.poster,
        youtube_url: result.youtubeUrl,
        channel_name: result.channelName,
        confidence: result.confidence,
        plot: result.plot,
        genre: result.genre,
        rating: result.rating,
        runtime: result.runtime,
        release_date: result.releaseDate,
        hit_count: 1,
        created_at: new Date().toISOString(),
        last_accessed_at: new Date().toISOString()
      }, {
        onConflict: 'input_hash'
      });

    if (error) {
      console.log(`[Cache] ⚠️  Failed to store in cache: ${error.message}`);
    } else {
      console.log(`[Cache] ✅ Cached successfully`);
    }
  } catch (error) {
    console.log(`[Cache] ⚠️  Cache storage error: ${error.message}`);
  }
}

// Layer 1: Parse YouTube URL
function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /embed\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m && m[1]) return m[1];
  }
  return null;
}

// Extract IMDb ID from URLs like:
// - https://www.imdb.com/title/tt0367594/
// - https://imdb.com/title/tt0367594
// - imdb.com/title/tt0367594
function extractIMDbId(url: string): string | null {
  const pattern = /imdb\.com\/title\/(tt\d+)/i;
  const match = url.match(pattern);
  if (match && match[1]) return match[1];
  return null;
}

// Fetch URL content for AI analysis
async function fetchUrlContent(url: string): Promise<string> {
  console.log(`[URL] 🔗 Fetching content from URL: ${url}`);
  
  try {
    const response = await retryWithBackoff(() =>
      fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        redirect: 'follow',
      })
    );

    if (!response.ok) {
      console.log(`[URL] ❌ Failed to fetch: ${response.status}`);
      return url; // Return URL as fallback
    }

    const html = await response.text();
    
    // Extract basic info to help AI
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1] : '';
    
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
                       html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
    const description = descMatch ? descMatch[1] : '';
    
    // Send URL, title, description, and first 3000 chars of HTML to AI
    // This gives AI enough context without being too large
    const context = `URL: ${url}\nPage Title: ${title}\nDescription: ${description}\n\nHTML content (first 3000 chars):\n${html.substring(0, 3000)}`;
    
    console.log(`[URL] ✅ Fetched ${html.length} bytes, extracted title: "${title}"`);
    return context;
  } catch (error) {
    console.log(`[URL] ⚠️  Error fetching URL: ${error.message}`);
    return url; // Return URL as fallback
  }
}

// Layer 1: YouTube Data API
async function fetchYouTubeMetadata(videoId: string): Promise<ContentResult | null> {
  const apiKey = Deno.env.get('YOUTUBE_API_KEY');
  if (!apiKey) {
    console.log('[YouTube] ❌ Missing YOUTUBE_API_KEY');
    return null;
  }

  console.log(`[YouTube] 🎥 Fetching metadata for video: ${videoId}`);

  const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`;

  try {
    const resp = await retryWithBackoff(() => fetch(url));
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

    const result: ContentResult = {
      title: snippet.title || 'YouTube Video',
      year: new Date(snippet.publishedAt).getFullYear(),
      type: 'youtube',
      genre: [],
      rating: 0,
      plot: snippet.description || '',
      poster: thumbUrl,
      streamingSources: [],
      confidence: 0.95,
      releaseDate: snippet.publishedAt,
      youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
      channelName: snippet.channelTitle
    };

    console.log(`[YouTube] ✅ Found: ${result.title}`);
    return result;
  } catch (error) {
    console.log(`[YouTube] ❌ Error: ${error.message}`);
    return null;
  }
}

// Layer 1: Fetch content from TMDB using IMDb ID
async function fetchTMDBByIMDbId(imdbId: string): Promise<ContentResult | null> {
  const tmdbApiKey = Deno.env.get('TMDB_API_KEY');
  if (!tmdbApiKey) {
    console.log('[TMDB] ⚠️  No API key');
    return null;
  }

  console.log(`[TMDB] 🔍 Fetching by IMDb ID: ${imdbId}`);

  const url = `https://api.themoviedb.org/3/find/${imdbId}?api_key=${tmdbApiKey}&external_source=imdb_id`;

  try {
    const resp = await retryWithBackoff(() => fetch(url));
    if (!resp.ok) {
      console.log(`[TMDB] ❌ API error: ${resp.status}`);
      return null;
    }

    const data = await resp.json();
    
    // Check movie_results first, then tv_results
    let result = null;
    let isMovie = true;
    
    if (data.movie_results && data.movie_results.length > 0) {
      result = data.movie_results[0];
      isMovie = true;
    } else if (data.tv_results && data.tv_results.length > 0) {
      result = data.tv_results[0];
      isMovie = false;
    }

    if (!result) {
      console.log(`[TMDB] ❌ No results found for IMDb ID: ${imdbId}`);
      return null;
    }

    const contentResult: ContentResult = {
      title: isMovie ? result.title : result.name,
      year: parseInt((isMovie ? result.release_date : result.first_air_date)?.split('-')[0] || '0'),
      type: isMovie ? 'movie' : 'tv',
      genre: [],
      rating: result.vote_average || 0,
      plot: result.overview || '',
      poster: result.poster_path
        ? `https://image.tmdb.org/t/p/w500${result.poster_path}`
        : 'https://images.unsplash.com/photo-1489599904821-6ef46474ebc3?w=300&h=450&fit=crop',
      streamingSources: [], // Will be filled later
      confidence: 0.98, // High confidence for direct IMDb ID lookup
      releaseDate: isMovie ? result.release_date : result.first_air_date,
      tmdbId: result.id,
      imdbId: imdbId // Store the IMDb ID we used
    };

    console.log(`[TMDB] ✅ Found by IMDb ID: ${contentResult.title} (${contentResult.year})`);
    return contentResult;
  } catch (error) {
    console.log(`[TMDB] ❌ Error fetching by IMDb ID: ${error.message}`);
    return null;
  }
}

// Layer 1: TMDB Multi-Search (before AI)
async function tmdbMultiSearch(query: string): Promise<ContentResult | null> {
  const tmdbApiKey = Deno.env.get('TMDB_API_KEY');
  if (!tmdbApiKey) {
    console.log('[TMDB] ⚠️  No API key');
    return null;
  }

  console.log(`[TMDB] 🔍 Multi-searching for: "${query}"`);

  const url = `https://api.themoviedb.org/3/search/multi?api_key=${tmdbApiKey}&query=${encodeURIComponent(query)}`;

  try {
    const resp = await retryWithBackoff(() => fetch(url));
    if (!resp.ok) return null;

    const data = await resp.json();
    const results = data.results || [];

    // Filter for movies and TV shows only
    const mediaResults = results.filter((r: any) => r.media_type === 'movie' || r.media_type === 'tv');

    if (mediaResults.length === 0) {
      console.log(`[TMDB] ❌ No matches found`);
      return null;
    }

    // Score all results by title similarity (fixed: was taking first result blindly)
    console.log(`[TMDB] 🔍 Scoring ${mediaResults.length} results for query: "${query}"`);

    const scoredResults = mediaResults.map((r: any) => {
      const resultTitle = r.media_type === 'movie' ? r.title : r.name;
      const similarity = calculateTitleSimilarity(query, resultTitle);
      console.log(`[TMDB]   📊 "${resultTitle}" - ${(similarity * 100).toFixed(0)}% similar`);
      return { ...r, similarity };
    });

    // Sort by similarity (highest first)
    scoredResults.sort((a, b) => b.similarity - a.similarity);

    const topResult = scoredResults[0];
    const isMovie = topResult.media_type === 'movie';

    // Adjust confidence based on title similarity
    const baseConfidence = topResult.similarity >= 0.9 ? 0.95 :
                           topResult.similarity >= 0.7 ? 0.85 :
                           topResult.similarity >= 0.5 ? 0.70 : 0.55;

    console.log(`[TMDB] ✅ Best match: "${isMovie ? topResult.title : topResult.name}" (${(topResult.similarity * 100).toFixed(0)}% similar)`);

    const result: ContentResult = {
      title: isMovie ? topResult.title : topResult.name,
      year: parseInt((isMovie ? topResult.release_date : topResult.first_air_date)?.split('-')[0] || '0'),
      type: isMovie ? 'movie' : 'tv',
      genre: [],
      rating: topResult.vote_average || 0,
      plot: topResult.overview || '',
      poster: topResult.poster_path
        ? `https://image.tmdb.org/t/p/w500${topResult.poster_path}`
        : 'https://images.unsplash.com/photo-1489599904821-6ef46474ebc3?w=300&h=450&fit=crop',
      streamingSources: [], // Will be filled later
      confidence: baseConfidence,
      releaseDate: isMovie ? topResult.release_date : topResult.first_air_date,
      tmdbId: topResult.id
    };

    console.log(`[TMDB] ✅ Found: ${result.title} (${result.year})`);
    return result;
  } catch (error) {
    console.log(`[TMDB] ❌ Error: ${error.message}`);
    return null;
  }
}

// Layer 2: AI Analysis with gpt-4o-mini
async function analyzeWithAI(input: SearchInput): Promise<ContentResult[]> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const isImage = !!input.imageBase64;
  const isUrl = !isImage && input.query && /^https?:\/\//.test(input.query);
  
  console.log(`[AI] 🤖 Analyzing ${isImage ? 'image' : isUrl ? 'URL' : 'text'} with gpt-4o-mini...`);

  const messages: any[] = [
    {
      role: 'system',
      content: isImage
        ? `You are an expert at identifying movies, TV shows, and documentaries from images. Analyze the image and return a JSON array of detected content.

Response format:
[{
  "title": "exact title",
  "year": year_number,
  "type": "movie" | "tv" | "documentary" | "youtube",
  "genre": ["genre1", "genre2"],
  "rating": 7.5,
  "runtime": "120 min",
  "plot": "description",
  "confidence": 0.95
}]

If multiple items visible, return all. If nothing found, return [].`
        : isUrl
        ? `You are a media identification expert. Analyze the provided URL content (HTML page) and identify the movie/TV show being referenced on that page. Look at the page title, description, and content to determine what movie or TV show this page is about.

Response format (JSON only):
{
  "title": "Movie/Show name",
  "type": "movie" | "tv" | "documentary" | "youtube",
  "year": "Release year",
  "confidence": "high" | "medium" | "low",
  "plot": "Brief description"
}

If not found, return: {"error": "No content found"}`
        : `You are a media identification expert. Parse the text and identify the movie/TV show being referenced.

Response format (JSON only):
{
  "title": "Movie/Show name",
  "type": "movie" | "tv" | "documentary" | "youtube",
  "year": "Release year",
  "confidence": "high" | "medium" | "low",
  "plot": "Brief description"
}

If not found, return: {"error": "No content found"}`
    }
  ];

  if (isImage) {
    messages.push({
      role: 'user',
      content: [
        {
          type: 'text',
          text: 'Identify all movies/TV shows/videos in this image. Be specific with titles.'
        },
        {
          type: 'image_url',
          image_url: {
            url: `data:${input.mimeType || 'image/jpeg'};base64,${input.imageBase64}`
          }
        }
      ]
    });
  } else {
    // If it's a URL, fetch the content first
    let content = input.query || '';
    if (isUrl) {
      content = await fetchUrlContent(input.query!);
    }
    
    messages.push({
      role: 'user',
      content: content
    });
  }

  try {
    const response = await retryWithBackoff(() =>
      fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini', // Using cheaper model for all analysis
          messages,
          max_tokens: isImage ? 1000 : 800,
          temperature: 0.1
        }),
      })
    );

    if (!response.ok) {
      const error = await response.text();
      console.log(`[AI] ❌ API error: ${response.status} - ${error}`);
      return [];
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      console.log('[AI] ❌ Empty response');
      return [];
    }

    // Parse JSON response
    let cleanContent = content.trim();
    if (cleanContent.includes('```json')) {
      cleanContent = cleanContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (cleanContent.includes('```')) {
      cleanContent = cleanContent.replace(/```\n?/g, '');
    }

    const parsed = JSON.parse(cleanContent);

    if (parsed.error) {
      console.log(`[AI] ⚠️  ${parsed.error}`);
      return [];
    }

    const results = Array.isArray(parsed) ? parsed : [parsed];
    console.log(`[AI] ✅ Identified ${results.length} item(s)`);

    return results.map((item: any) => ({
      title: item.title,
      year: parseInt(item.year) || 0,
      type: item.type || 'movie',
      genre: item.genre || [],
      rating: item.rating || 0,
      runtime: item.runtime,
      plot: item.plot || '',
      poster: '', // Will be filled by TMDB
      streamingSources: [],
      confidence: item.confidence === 'high' ? 0.95 :
                  item.confidence === 'medium' ? 0.8 :
                  item.confidence || 0.6,
      releaseDate: item.year ? `${item.year}-01-01` : undefined
    }));
  } catch (error) {
    console.log(`[AI] ❌ Error: ${error.message}`);
    return [];
  }
}

// Layer 2b: AI Analysis with Claude Vision (more accurate OCR for screenshots)
async function analyzeWithClaude(input: SearchInput): Promise<ContentResult[]> {
  const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!anthropicApiKey) {
    console.log('[Claude] ⚠️  No Anthropic API key found, skipping Claude');
    return [];
  }

  const isImage = !!input.imageBase64;
  if (!isImage) {
    console.log('[Claude] ℹ️  Claude Vision only used for images, skipping text');
    return [];
  }

  console.log(`[Claude] 🧠 Analyzing image with ${CLAUDE_MODEL}...`);

  // OCR-focused prompt that extracts visible text first
  const systemPrompt = `You are an expert at identifying movies, TV shows, and streaming content from images.

STEP 1 - OCR: First, extract ALL visible text from the image exactly as shown. Look for:
- Title text (often large, prominent)
- Year or date information
- Platform branding (Netflix, Hulu, Disney+, HBO Max, Apple TV+, Prime Video, etc.)
- Subtitles or captions
- Menu text, ratings (TV-MA, PG-13), runtime

STEP 2 - Platform Detection: Identify any streaming platform logos or UI elements.

STEP 3 - Content Identification: Based on the extracted text AND visual context:
- Identify the EXACT title (use OCR text if visible, not your memory)
- For standup comedy specials: Include both comedian name AND special name (e.g., "Tom Segura: Teacher" not just "Tom Segura")
- Release year (if visible or confidently known)
- Content type

STEP 4 - Image Classification: What type of image is this?
- streaming_screenshot: Screenshot from a streaming platform showing title/info
- poster: Official movie or TV show poster
- scene: A frame from the actual content
- promotional: Marketing material or banner

Return ONLY valid JSON (no markdown, no explanation):
{
  "ocr_text": ["all", "visible", "text", "extracted"],
  "platform_detected": "Netflix",
  "title": "exact full title including subtitle",
  "year": 2023,
  "type": "movie" | "tv" | "documentary" | "special",
  "image_type": "streaming_screenshot" | "poster" | "scene" | "promotional",
  "confidence": 0.95,
  "genre": ["Comedy", "Stand-up"],
  "plot": "brief description if determinable from image context"
}

IMPORTANT: For standup comedy specials, the title should be the FULL name shown (e.g., "Tom Segura: Teacher" not just "Teacher" or "Tom Segura").`;

  try {
    const response = await retryWithBackoff(() =>
      fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': anthropicApiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: CLAUDE_MODEL,
          max_tokens: 1024,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: input.mimeType || 'image/jpeg',
                  data: input.imageBase64
                }
              },
              {
                type: 'text',
                text: systemPrompt
              }
            ]
          }]
        })
      })
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`[Claude] ❌ API error: ${response.status} - ${errorText}`);
      return [];
    }

    const data = await response.json();
    const content = data.content?.[0]?.text;

    if (!content) {
      console.log('[Claude] ❌ Empty response');
      return [];
    }

    // Parse JSON response
    let cleanContent = content.trim();
    if (cleanContent.includes('```json')) {
      cleanContent = cleanContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (cleanContent.includes('```')) {
      cleanContent = cleanContent.replace(/```\n?/g, '');
    }

    const parsed = JSON.parse(cleanContent);

    if (parsed.error) {
      console.log(`[Claude] ⚠️  ${parsed.error}`);
      return [];
    }

    // Log OCR results for debugging
    if (parsed.ocr_text && parsed.ocr_text.length > 0) {
      console.log(`[Claude] 📝 OCR extracted: ${parsed.ocr_text.join(', ')}`);
    }
    if (parsed.platform_detected) {
      console.log(`[Claude] 🎬 Platform detected: ${parsed.platform_detected}`);
    }
    if (parsed.image_type) {
      console.log(`[Claude] 📸 Image type: ${parsed.image_type}`);
    }

    console.log(`[Claude] ✅ Identified: "${parsed.title}" (${parsed.year}) - ${parsed.type}`);

    // Convert to ContentResult format
    const result: ContentResult = {
      title: parsed.title,
      year: parseInt(parsed.year) || 0,
      type: parsed.type === 'special' ? 'tv' : (parsed.type || 'movie'),
      genre: parsed.genre || [],
      rating: 0,
      runtime: undefined,
      plot: parsed.plot || '',
      poster: '', // Will be filled by TMDB
      streamingSources: [],
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence :
                  parsed.confidence === 'high' ? 0.95 :
                  parsed.confidence === 'medium' ? 0.8 : 0.7,
      releaseDate: parsed.year ? `${parsed.year}-01-01` : undefined
    };

    return [result];
  } catch (error) {
    console.log(`[Claude] ❌ Error: ${error.message}`);
    return [];
  }
}

// Layer 3: Enrich with TMDB poster and ID
async function enrichWithTMDB(result: ContentResult): Promise<ContentResult> {
  const tmdbApiKey = Deno.env.get('TMDB_API_KEY');
  if (!tmdbApiKey) return result;

  console.log(`[TMDB] 🖼️  Fetching metadata for: ${result.title}`);

  const searchType = result.type === 'tv' ? 'tv' : 'movie';
  const url = `https://api.themoviedb.org/3/search/${searchType}?api_key=${tmdbApiKey}&query=${encodeURIComponent(result.title)}`;

  try {
    const response = await retryWithBackoff(() => fetch(url));
    if (!response.ok) return result;

    const data = await response.json();
    const tmdbResults = data.results || [];

    if (tmdbResults.length > 0) {
      let bestMatch = tmdbResults[0];

      // Match by year if available
      if (result.year) {
        const yearMatch = tmdbResults.find((r: any) => {
          const releaseYear = searchType === 'movie'
            ? r.release_date?.split('-')[0]
            : r.first_air_date?.split('-')[0];
          return parseInt(releaseYear) === result.year;
        });
        if (yearMatch) bestMatch = yearMatch;
      }

      // Store TMDB ID for watch providers lookup
      result.tmdbId = bestMatch.id;

      if (bestMatch.poster_path && !result.poster) {
        result.poster = `https://image.tmdb.org/t/p/w500${bestMatch.poster_path}`;
        console.log(`[TMDB] ✅ Found poster and ID: ${result.tmdbId}`);
      } else {
        console.log(`[TMDB] ✅ Found ID: ${result.tmdbId}`);
      }
    }
  } catch (error) {
    console.log(`[TMDB] ⚠️  Error: ${error.message}`);
  }

  return result;
}

// Layer 3: Fetch streaming sources from Streaming Availability API (with deep links!)
async function fetchStreamingAvailability(
  title: string,
  year: number,
  mediaType: 'movie' | 'tv'
): Promise<StreamingSource[]> {
  const apiKey = Deno.env.get('STREAMING_AVAILABILITY_API_KEY');
  if (!apiKey) return [];

  console.log(`[Streaming API] 🔗 Fetching deep links for: ${title}`);

  const searchType = mediaType === 'tv' ? 'series' : 'movie';
  const url = `https://streaming-availability.p.rapidapi.com/shows/search/title?title=${encodeURIComponent(title)}&country=us&show_type=${searchType}&output_language=en`;

  try {
    const response = await retryWithBackoff(() =>
      fetch(url, {
        headers: {
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': 'streaming-availability.p.rapidapi.com'
        }
      })
    );

    if (!response.ok) {
      console.log(`[Streaming API] ❌ Failed: ${response.status}`);
      return [];
    }

    const data = await response.json();

    // Find best match by TITLE SIMILARITY + year (fixed: was year-only before)
    let matchedShow: any = null;
    let bestScore = 0;

    if (data && data.length > 0) {
      console.log(`[Streaming API] 🔍 Scoring ${data.length} results for title: "${title}"`);

      for (const show of data) {
        const showTitle = show.title || show.name || '';
        const showYear = show.firstAirYear || show.releaseYear;

        // Calculate title similarity (0-1)
        const titleScore = calculateTitleSimilarity(title, showTitle);

        // Year bonus: +0.1 if within 1 year
        const yearBonus = year && showYear && Math.abs(showYear - year) <= 1 ? 0.1 : 0;

        const totalScore = titleScore + yearBonus;

        console.log(`[Streaming API]   📊 "${showTitle}" (${showYear}) - Title: ${(titleScore * 100).toFixed(0)}%, Total: ${(totalScore * 100).toFixed(0)}%`);

        if (totalScore > bestScore) {
          bestScore = totalScore;
          matchedShow = show;
        }
      }

      // Require >60% title similarity to accept match
      if (bestScore < 0.6) {
        console.log(`[Streaming API] ⚠️  Best match "${matchedShow?.title}" only ${(bestScore * 100).toFixed(0)}% similar - rejecting`);
        matchedShow = null;
      } else if (matchedShow) {
        console.log(`[Streaming API] ✅ Best match: "${matchedShow.title}" with ${(bestScore * 100).toFixed(0)}% confidence`);
      }
    }

    if (!matchedShow || !matchedShow.streamingOptions?.us) {
      console.log(`[Streaming API] ⚠️  No streaming options found`);
      return [];
    }

    // Deduplicate by service name, prioritizing: free > subscription > rent > buy
    const serviceMap = new Map<string, StreamingSource>();
    const typePriority = { 'free': 0, 'subscription': 1, 'rent': 2, 'buy': 3 };

    for (const option of matchedShow.streamingOptions.us) {
      const serviceName = option.service.name;
      const optionType = option.type === 'subscription' ? 'subscription' :
                         option.type === 'rent' ? 'rent' :
                         option.type === 'buy' ? 'buy' : 'free';

      // Skip rent and buy options (user only wants free/subscription)
      if (optionType === 'rent' || optionType === 'buy') {
        console.log(`[Streaming API] ⏭️  Skipping "${serviceName}" (${optionType})`);
        continue;
      }

      console.log(`[Streaming API] 📺 Service: "${serviceName}" (${optionType})`);

      const source: StreamingSource = {
        name: serviceName,
        logo: getStreamingServiceLogo(serviceName),
        url: option.link,
        type: optionType,
        price: option.price ? `$${option.price.amount}` : undefined
      };

      // Only add if this service doesn't exist yet, or if this option has higher priority
      const existing = serviceMap.get(serviceName);
      if (!existing || typePriority[optionType] < typePriority[existing.type]) {
        serviceMap.set(serviceName, source);
      }
    }

    const sources = Array.from(serviceMap.values());
    console.log(`[Streaming API] ✅ Found ${sources.length} unique sources (free/subscription only)`);
    return sources;
  } catch (error) {
    console.log(`[Streaming API] ❌ Error: ${error.message}`);
    return [];
  }
}

// Layer 3: Fetch TMDB watch providers (fallback, no deep links)
async function fetchTMDBWatchProviders(
  tmdbId: number,
  mediaType: 'movie' | 'tv',
  region: string = 'US'
): Promise<StreamingSource[]> {
  const tmdbApiKey = Deno.env.get('TMDB_API_KEY');
  if (!tmdbApiKey) return [];

  console.log(`[TMDB Watch] 🎬 Fetching providers for ${mediaType}/${tmdbId} in ${region}`);

  const url = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}/watch/providers?api_key=${tmdbApiKey}`;

  try {
    const response = await retryWithBackoff(() => fetch(url));
    if (!response.ok) return [];

    const data = await response.json();
    const regionData = data.results?.[region];

    if (!regionData) {
      console.log(`[TMDB Watch] ⚠️  No providers found for ${region}`);
      return [];
    }

    const sources: StreamingSource[] = [];

    // Helper function to filter out channel aggregators
    const isDirectPlatform = (providerName: string): boolean => {
      const name = providerName.toLowerCase();
      // Exclude anything that's a "Channel" (e.g., "Paramount+ Amazon Channel")
      if (name.includes(' channel')) {
        console.log(`[TMDB Watch] ⏭️  Skipping channel aggregator: "${providerName}"`);
        return false;
      }
      return true;
    };

    // Streaming (flatrate) - subscription services
    const flatrate = regionData.flatrate || [];
    for (const provider of flatrate) {
      if (!isDirectPlatform(provider.provider_name)) continue;

      sources.push({
        name: provider.provider_name,
        logo: getStreamingServiceLogo(provider.provider_name),
        url: regionData.link,
        type: 'subscription'
      });
    }

    // Free (with ads)
    const free = regionData.free || [];
    for (const provider of free) {
      if (!isDirectPlatform(provider.provider_name)) continue;

      sources.push({
        name: provider.provider_name,
        logo: getStreamingServiceLogo(provider.provider_name),
        url: regionData.link,
        type: 'free'
      });
    }

    // Skip buy/rent options - user only wants free/subscription

    console.log(`[TMDB Watch] ✅ Found ${sources.length} direct streaming platforms (no channels/rent/buy)`);
    return sources;
  } catch (error) {
    console.log(`[TMDB Watch] ❌ Error: ${error.message}`);
    return [];
  }
}

// Layer 4: Fetch IMDB ID from TMDB (for fallback link)
async function fetchIMDBId(tmdbId: number, mediaType: 'movie' | 'tv'): Promise<string | null> {
  const tmdbApiKey = Deno.env.get('TMDB_API_KEY');
  if (!tmdbApiKey) return null;

  console.log(`[IMDB] 🔍 Fetching IMDB ID for ${mediaType}/${tmdbId}`);

  const url = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}/external_ids?api_key=${tmdbApiKey}`;

  try {
    const response = await retryWithBackoff(() => fetch(url));
    if (!response.ok) return null;

    const data = await response.json();
    const imdbId = data.imdb_id;

    if (imdbId) {
      console.log(`[IMDB] ✅ Found IMDB ID: ${imdbId}`);
      return imdbId;
    }

    console.log(`[IMDB] ⚠️  No IMDB ID found`);
    return null;
  } catch (error) {
    console.log(`[IMDB] ❌ Error: ${error.message}`);
    return null;
  }
}

// Helper: Get streaming service logo from SuperTinyIcons
function getStreamingServiceLogo(serviceName: string): string {
  // Mapping of streaming service names to SuperTinyIcons filenames
  const iconMap: { [key: string]: string } = {
    // Major streaming services
    'netflix': 'netflix',
    'hulu': 'hulu',
    'disney plus': 'disneyplus',
    'disney+': 'disneyplus',
    'disneyplus': 'disneyplus',
    'hbo max': 'hbo',
    'hbo': 'hbo',
    'max': 'hbo',

    // Amazon variations
    'prime video': 'amazon',
    'amazon prime': 'amazon',
    'amazon prime video': 'amazon',
    'amazon video': 'amazon',
    'amazon': 'amazon',

    // Apple variations
    'apple tv': 'apple',
    'apple tv+': 'apple',
    'apple tv plus': 'apple',
    'appletv': 'apple',
    'itunes': 'apple',

    // Paramount variations
    'paramount+': 'paramount',
    'paramount plus': 'paramount',
    'paramountplus': 'paramount',
    'cbs': 'paramount',
    'cbs all access': 'paramount',

    // Other major services
    'peacock': 'peacock',
    'showtime': 'showtime',
    'starz': 'starz',
    'espn': 'espn',
    'espn+': 'espn',
    'fx': 'fx',
    'amc': 'amc',
    'amc+': 'amc',
    'youtube': 'youtube',
    'youtube premium': 'youtube',
    'google play': 'google',
    'google play movies': 'google',
    'vudu': 'vudu',
    'crunchyroll': 'crunchyroll',
    'funimation': 'funimation',
    'tubi': 'tubi',
    'pluto tv': 'pluto',
    'pluto': 'pluto',
    'roku': 'roku',
    'roku channel': 'roku',
    'sling tv': 'sling',
    'sling': 'sling',
    'fubotv': 'fubo',
    'fubo': 'fubo',
    'directv': 'directv',
    'discovery+': 'discovery',
    'discovery plus': 'discovery',
    'bbc iplayer': 'bbc',
    'bbc': 'bbc',
    'microsoft': 'microsoft',
    'criterion': 'criterion',
    'criterion channel': 'criterion',
    'mubi': 'mubi',
    'shudder': 'shudder',
    'sundance now': 'sundance',
    'mgm+': 'mgm',
    'bet+': 'bet',
    'nbc': 'nbc',
    'abc': 'abc',
    'fox': 'fox',
    'pbs': 'pbs'
  };

  const normalizedName = serviceName.toLowerCase().trim();
  const iconName = iconMap[normalizedName];

  if (iconName) {
    console.log(`[Icons] ✅ Mapped "${serviceName}" → ${iconName}.svg`);
    return `https://edent.github.io/SuperTinyIcons/images/svg/${iconName}.svg`;
  }

  // Fallback to text badge for unknown services
  console.log(`[Icons] ⚠️  Unknown service "${serviceName}" - using text badge`);
  const encodedName = encodeURIComponent(serviceName.substring(0, 2).toUpperCase());
  return `https://ui-avatars.com/api/?name=${encodedName}&background=666&color=fff&size=64&bold=true&format=svg`;
}

// Helper: Generate reliable logo URL (for non-streaming services like JustWatch)
function getReliableLogo(serviceName: string, bgColor: string = '4285F4'): string {
  // Use UI Avatars - ALWAYS works, generates text badge with service name
  const encodedName = encodeURIComponent(serviceName);
  return `https://ui-avatars.com/api/?name=${encodedName}&background=${bgColor}&color=fff&size=64&bold=true&format=svg`;
}

// Layer 3: Generate smart streaming links - ONLY direct platform links
async function generateSmartStreamingLinks(
  title: string,
  year?: number,
  tmdbId?: number,
  mediaType?: 'movie' | 'tv',
  imdbId?: string
): Promise<StreamingSource[]> {
  console.log(`[Streaming] 🔗 Generating streaming sources for: ${title}`);

  let sources: StreamingSource[] = [];

  // PRIORITY 1: Streaming Availability API (deep links to platforms!)
  if (ENABLE_STREAMING_AVAILABILITY_API && year && mediaType && (mediaType === 'movie' || mediaType === 'tv')) {
    const streamingSources = await fetchStreamingAvailability(title, year, mediaType);
    if (streamingSources.length > 0) {
      sources = streamingSources;
      console.log(`[Streaming] ✅ Using ${sources.length} deep links from Streaming API`);
      return sources;
    }
  }

  // PRIORITY 2: TMDB watch providers (platform names but no deep links)
  if (tmdbId && mediaType && (mediaType === 'movie' || mediaType === 'tv')) {
    const tmdbSources = await fetchTMDBWatchProviders(tmdbId, mediaType);
    if (tmdbSources.length > 0) {
      sources = tmdbSources;
      console.log(`[Streaming] ✅ Using ${sources.length} TMDB watch providers (no deep links)`);
      return sources;
    }
  }

  // PRIORITY 3: IMDB fallback link (when no streaming platforms available)
  if (imdbId) {
    console.log(`[Streaming] 📽️  No streaming platforms - using IMDB fallback`);
    return [{
      name: 'IMDb',
      logo: 'https://edent.github.io/SuperTinyIcons/images/svg/imdb.svg',
      url: `https://www.imdb.com/title/${imdbId}/`,
      type: 'free'
    }];
  }

  // NO AGGREGATOR FALLBACKS - Return empty if no direct platform links or IMDB found
  console.log(`[Streaming] ⚠️  No streaming platforms or IMDB link available`);
  return [];
}

// Main handler
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = performance.now();
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🚀 UNIFIED SEARCH REQUEST - ${new Date().toISOString()}`);
  console.log(`${'='.repeat(80)}\n`);

  try {
    const input: SearchInput = await req.json();
    const isImage = !!input.imageBase64;
    const contentType = isImage ? 'image' : (input.query?.match(/^https?:\/\//) ? 'url' : 'text');

    console.log(`[Input] Type: ${contentType}`);

    // Generate cache key
    const cacheInput = isImage ? input.imageBase64! : input.query!;
    const cacheHash = await generateHash(cacheInput);

    // LAYER 1: Check cache
    console.log(`\n📦 LAYER 1: FREE & INSTANT CHECKS`);
    console.log(`${'─'.repeat(80)}`);

    let cachedResult = await checkCache(cacheHash);
    if (cachedResult) {
      const duration = performance.now() - startTime;
      console.log(`\n✅ CACHE HIT - Returning in ${duration.toFixed(2)}ms (saved API costs!)\n`);
      return new Response(JSON.stringify({ results: [cachedResult] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let results: ContentResult[] = [];

    // YouTube URL detection
    if (!isImage && input.query) {
      const videoId = extractYouTubeVideoId(input.query);
      if (videoId) {
        console.log(`[YouTube] 🎥 YouTube URL detected`);
        const ytResult = await fetchYouTubeMetadata(videoId);
        if (ytResult) {
          results = [ytResult];
          await storeInCache(cacheHash, contentType, ytResult);

          const duration = performance.now() - startTime;
          console.log(`\n✅ YOUTUBE DIRECT - Completed in ${duration.toFixed(2)}ms\n`);
          return new Response(JSON.stringify({ results }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }
    }

    // IMDb URL detection
    if (!isImage && input.query && !results.length) {
      const imdbId = extractIMDbId(input.query);
      if (imdbId) {
        console.log(`[IMDb] 🎬 IMDb URL detected: ${imdbId}`);
        const imdbResult = await fetchTMDBByIMDbId(imdbId);
        if (imdbResult) {
          // Fetch streaming sources
          const mediaType = imdbResult.type === 'tv' ? 'tv' : 'movie';
          imdbResult.streamingSources = await generateSmartStreamingLinks(
            imdbResult.title,
            imdbResult.year,
            imdbResult.tmdbId,
            mediaType,
            imdbId // Use the extracted IMDb ID
          );

          results = [imdbResult];
          await storeInCache(cacheHash, contentType, imdbResult);

          const duration = performance.now() - startTime;
          console.log(`\n✅ IMDb DIRECT - Completed in ${duration.toFixed(2)}ms\n`);
          return new Response(JSON.stringify({ results }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }
    }

    // TMDB multi-search for text (before AI)
    // Skip for URLs - they'll be handled by AI which can analyze the page content
    const isUrl = !isImage && input.query && /^https?:\/\//.test(input.query);
    if (!isImage && !isUrl && input.query && !results.length) {
      const tmdbResult = await tmdbMultiSearch(input.query);
      if (tmdbResult && tmdbResult.confidence >= 0.75) {
        console.log(`[TMDB] 🎯 High confidence match - skipping AI`);

        // Fetch IMDB ID for fallback link
        const mediaType = tmdbResult.type === 'tv' ? 'tv' : 'movie';
        if (tmdbResult.tmdbId) {
          tmdbResult.imdbId = await fetchIMDBId(tmdbResult.tmdbId, mediaType) || undefined;
        }

        tmdbResult.streamingSources = await generateSmartStreamingLinks(
          tmdbResult.title,
          tmdbResult.year,
          tmdbResult.tmdbId,
          mediaType,
          tmdbResult.imdbId
        );
        results = [tmdbResult];
        await storeInCache(cacheHash, contentType, tmdbResult);

        const duration = performance.now() - startTime;
        console.log(`\n✅ TMDB DIRECT - Completed in ${duration.toFixed(2)}ms (saved AI costs!)\n`);
        return new Response(JSON.stringify({ results }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // LAYER 2: AI Analysis (Claude for images, OpenAI as fallback)
    console.log(`\n🤖 LAYER 2: AI ANALYSIS`);
    console.log(`${'─'.repeat(80)}`);

    const isImageInput = !!input.imageBase64;

    // Try Claude Vision first for images (better OCR for streaming screenshots)
    if (isImageInput && ENABLE_CLAUDE_VISION) {
      console.log(`[AI] 🎯 Using Claude Vision (${CLAUDE_MODEL}) for image analysis...`);
      results = await analyzeWithClaude(input);

      if (results.length > 0) {
        console.log(`[AI] ✅ Claude successfully identified content`);
      } else {
        console.log(`[AI] ⚠️  Claude returned no results, falling back to OpenAI...`);
      }
    }

    // Fallback to OpenAI if Claude fails or for text queries
    if (!results.length) {
      console.log(`[AI] 🔄 Using OpenAI (gpt-4o-mini)...`);
      results = await analyzeWithAI(input);
    }

    if (!results.length) {
      const duration = performance.now() - startTime;
      console.log(`\n⚠️  No content identified - Completed in ${duration.toFixed(2)}ms\n`);
      return new Response(JSON.stringify({ results: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // LAYER 3: Enrichment
    console.log(`\n🎨 LAYER 3: ENRICHMENT`);
    console.log(`${'─'.repeat(80)}`);

    const enrichedResults = await Promise.all(
      results.map(async (result) => {
        const enriched = await enrichWithTMDB(result);
        const mediaType = enriched.type === 'tv' ? 'tv' : (enriched.type === 'documentary' ? 'movie' : 'movie');

        // Fetch IMDB ID for fallback link
        if (enriched.tmdbId && (mediaType === 'movie' || mediaType === 'tv')) {
          enriched.imdbId = await fetchIMDBId(enriched.tmdbId, mediaType) || undefined;
        }

        enriched.streamingSources = await generateSmartStreamingLinks(
          enriched.title,
          enriched.year,
          enriched.tmdbId,
          mediaType as 'movie' | 'tv',
          enriched.imdbId
        );
        return enriched;
      })
    );

    // Store first result in cache
    if (enrichedResults.length > 0) {
      await storeInCache(cacheHash, contentType, enrichedResults[0]);
    }

    const duration = performance.now() - startTime;
    console.log(`\n✅ SUCCESS - Completed in ${duration.toFixed(2)}ms`);
    console.log(`📊 Results: ${enrichedResults.length} item(s)`);
    console.log(`${'='.repeat(80)}\n`);

    return new Response(JSON.stringify({ results: enrichedResults }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    const duration = performance.now() - startTime;
    console.error(`\n❌ ERROR - ${error.message}`);
    console.error(`⏱️  Duration: ${duration.toFixed(2)}ms`);
    console.error(`${'='.repeat(80)}\n`);

    return new Response(
      JSON.stringify({ error: error.message, results: [] }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
