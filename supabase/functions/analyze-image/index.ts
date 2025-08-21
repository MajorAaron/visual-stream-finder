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
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      throw new Error('No image provided');
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
            content: `You are an expert at identifying movies and TV shows from images. 
            Analyze the image and identify any movies, TV shows, or documentaries visible.
            Return a JSON array of objects with this exact structure:
            [{
              "title": "exact title",
              "year": year_number,
              "type": "movie" | "tv" | "documentary",
              "genre": ["genre1", "genre2"],
              "rating": imdb_rating_number,
              "runtime": "duration_string",
              "plot": "brief plot description",
              "poster": "https://placeholder-poster-url.jpg",
              "confidence": confidence_score_0_to_1
            }]
            
            If you can't identify anything clearly, return an empty array [].
            Be confident in your identifications - only include results you're sure about.`
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
      const poster = await fetchPosterFromTMDB(item.title, item.year, item.type);
      return {
        ...item,
        poster,
        streamingSources: getStreamingSources(item.title)
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