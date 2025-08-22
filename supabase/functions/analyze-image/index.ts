import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const tmdbApiKey = Deno.env.get('TMDB_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DetectedContent {
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
  try {
    console.log(`Searching TMDB for: ${title} (${year})`);
    
    // Search for the title on TMDB
    const searchType = type === 'movie' ? 'movie' : 'tv';
    const searchUrl = `https://api.themoviedb.org/3/search/${searchType}?api_key=${tmdbApiKey}&query=${encodeURIComponent(title)}&year=${year}`;
    
    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();
    
    if (searchData.results && searchData.results.length > 0) {
      const result = searchData.results[0];
      const posterPath = result.poster_path;
      
      if (posterPath) {
        const fullPosterUrl = `https://image.tmdb.org/t/p/w500${posterPath}`;
        console.log(`Found TMDB poster: ${fullPosterUrl}`);
        return fullPosterUrl;
      }
    }
    
    console.log(`No TMDB poster found for ${title}`);
    return "https://images.unsplash.com/photo-1489599904821-6ef46474ebc3?w=300&h=450&fit=crop";
  } catch (error) {
    console.error('Error fetching TMDB poster:', error);
    return "https://images.unsplash.com/photo-1489599904821-6ef46474ebc3?w=300&h=450&fit=crop";
  }
};

// Fetch real streaming data from Streaming Availability API
const fetchStreamingData = async (title: string, year: number, type: 'movie' | 'tv' | 'documentary'): Promise<StreamingSource[]> => {
  const streamingApiKey = Deno.env.get('STREAMING_AVAILABILITY_API_KEY');
  if (!streamingApiKey) {
    console.error('Streaming Availability API key not found');
    return getStreamingSources(title);
  }

  try {
    // Search for the title using the shows/search/title endpoint
    const searchType = type === 'tv' ? 'series' : 'movie';
    const searchUrl = `https://streaming-availability.p.rapidapi.com/shows/search/title?title=${encodeURIComponent(title)}&country=us&show_type=${searchType}&output_language=en`;
    
    console.log(`Searching Streaming Availability for: ${title} (${year}) as ${searchType}`);
    
    const searchResponse = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': streamingApiKey,
        'X-RapidAPI-Host': 'streaming-availability.p.rapidapi.com'
      }
    });

    if (!searchResponse.ok) {
      console.error('Streaming API search failed:', searchResponse.status, await searchResponse.text());
      return getStreamingSources(title);
    }

    const searchData = await searchResponse.json();
    console.log(`Streaming API found ${searchData?.length || 0} results for ${title}`);

    // Find the matching title and year
    let matchedShow = null;
    if (searchData && searchData.length > 0) {
      matchedShow = searchData.find((show: any) => {
        const showYear = show.firstAirYear || show.releaseYear;
        return Math.abs(showYear - year) <= 1; // Allow 1 year difference
      }) || searchData[0]; // Fallback to first result
    }

    if (!matchedShow) {
      console.log('No matching show found, using fallback');
      return getStreamingSources(title);
    }

    console.log(`Found matching show: ${matchedShow.title} (${matchedShow.releaseYear || matchedShow.firstAirYear})`);

    // Extract streaming sources from the matched show
    const streamingSources: StreamingSource[] = [];
    
    if (matchedShow.streamingOptions && matchedShow.streamingOptions.us) {
      for (const option of matchedShow.streamingOptions.us) {
        const service = option.service;
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

    if (streamingSources.length > 0) {
      console.log(`Found ${streamingSources.length} real streaming sources for ${title}`);
      return streamingSources;
    }

  } catch (error) {
    console.error('Error fetching streaming data:', error);
  }

  // Fallback to mock data
  console.log('Using fallback streaming sources');
  return getStreamingSources(title);
};

// Fallback streaming sources
const getStreamingSources = (title: string): StreamingSource[] => [
  {
    name: "Netflix",
    logo: "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=40&h=40&fit=crop",
    url: `https://www.netflix.com/search?q=${encodeURIComponent(title)}`,
    type: "subscription"
  },
  {
    name: "Amazon Prime",
    logo: "https://images.unsplash.com/photo-1523474253046-8cd2748b5fd2?w=40&h=40&fit=crop",
    url: `https://www.primevideo.com/search/ref=atv_nb_sr?phrase=${encodeURIComponent(title)}`,
    type: "subscription"
  },
  {
    name: "Apple TV+",
    logo: "https://images.unsplash.com/photo-1611605698335-8b1569810432?w=40&h=40&fit=crop",
    url: `https://tv.apple.com/search?term=${encodeURIComponent(title)}`,
    type: "subscription"
  },
  {
    name: "Disney+",
    logo: "https://images.unsplash.com/photo-1606578793980-6e18689e6a3d?w=40&h=40&fit=crop",
    url: `https://www.disneyplus.com/search/${encodeURIComponent(title)}`,
    type: "subscription"
  }
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Server-side validation
    const contentLength = req.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
      console.error('Request too large:', contentLength);
      return new Response(JSON.stringify({ error: 'File too large. Maximum size is 10MB.' }), {
        status: 413,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { imageBase64 } = await req.json();

    // Validate image data
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid image data provided.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Basic validation of base64 image format
    if (imageBase64.length > 14 * 1024 * 1024) { // ~10MB when base64 encoded
      return new Response(JSON.stringify({ error: 'Image too large. Maximum size is 10MB.' }), {
        status: 413,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Analyzing image with OpenAI Vision API...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are an expert at identifying movies and TV shows from images, including upcoming releases and newer titles. 
            Analyze the image and identify any movies, TV shows, or documentaries visible.
            
            IMPORTANT: Include upcoming releases, sequels, and newer titles (2024-2025) even if they haven't been widely released yet.
            For franchises like Jurassic World, Marvel, DC, etc., be aware of announced sequels and upcoming installments.
            
            Return a JSON array of objects with this exact structure:
            [{
              "title": "exact title",
              "year": year_number,
              "type": "movie" | "tv" | "documentary",
              "genre": ["genre1", "genre2"],
              "rating": 7.5,
              "runtime": "120 min",
              "plot": "brief plot description",
              "poster": "https://placeholder-poster-url.jpg",
              "confidence": confidence_score_0_to_1
            }]
            
            Guidelines:
            - Include results with confidence >= 0.6
            - For upcoming releases, use estimated year and rating of 7.5
            - For sequels, include the franchise name and sequel number
            - If you can't identify anything clearly, return an empty array []`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'What movies or TV shows can you identify in this image?'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        max_tokens: 1000
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    console.log('OpenAI response:', content);

    let detectedContent: DetectedContent[];
    
    try {
      // Clean the response - remove markdown code blocks if present
      let cleanContent = content.trim();
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/^```json\n?/, '').replace(/\n?```$/, '');
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/^```\n?/, '').replace(/\n?```$/, '');
      }
      
      // Try to parse the JSON response
      const parsed = JSON.parse(cleanContent);
      detectedContent = Array.isArray(parsed) ? parsed : [parsed];
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', parseError);
      console.error('Raw content:', content);
      // Return empty array if parsing fails
      detectedContent = [];
    }

    // Add streaming sources and fetch real posters for each detected item
    const results = await Promise.all(detectedContent.map(async (item) => {
      const [poster, streamingSources] = await Promise.all([
        fetchPosterFromTMDB(item.title, item.year, item.type),
        fetchStreamingData(item.title, item.year, item.type)
      ]);
      return {
        ...item,
        poster,
        streamingSources
      };
    }));

    console.log('Final results:', results);

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-image function:', error);
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