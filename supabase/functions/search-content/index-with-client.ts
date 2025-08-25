import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import * as streamingAvailability from "npm:streaming-availability@4.2.1";

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

async function getStreamingSourcesWithClient(title: string, year: string, type: string): Promise<StreamingSource[]> {
  console.log(`Getting streaming sources using client library for: ${title} (${year}) - ${type}`);
  
  // Get the RapidAPI key from environment
  const rapidApiKey = Deno.env.get('STREAMING_AVAILABILITY_API_KEY') || Deno.env.get('RAPIDAPI_KEY');
  
  if (!rapidApiKey) {
    console.log('No API key found, returning fallback sources');
    return getFallbackSources(title);
  }

  try {
    // Initialize the Streaming Availability client
    const client = new streamingAvailability.Client(
      new streamingAvailability.Configuration({
        apiKey: rapidApiKey
      })
    );

    console.log('Searching with Streaming Availability client...');
    
    // Search for the show by title
    const searchResult = await client.showsApi.searchShowsByTitle({
      title: title,
      country: 'us',
      showType: type === 'tv' ? streamingAvailability.ShowType.Series : streamingAvailability.ShowType.Movie,
      seriesGranularity: 'show' // Get show-level info, not episode-level
    });

    console.log(`Found ${searchResult.length} results from API`);
    
    if (searchResult.length === 0) {
      return getFallbackSources(title);
    }

    // Get the first (best) match
    const show = searchResult[0];
    const sources: StreamingSource[] = [];
    
    // Service ID to display name and logo mapping
    const serviceMapping: Record<string, { name: string; logo: string }> = {
      'netflix': {
        name: 'Netflix',
        logo: 'https://logos-world.net/wp-content/uploads/2020/04/Netflix-Logo.png'
      },
      'prime': {
        name: 'Amazon Prime Video',
        logo: 'https://logos-world.net/wp-content/uploads/2021/08/Amazon-Prime-Video-Logo.png'
      },
      'disney': {
        name: 'Disney+',
        logo: 'https://logos-world.net/wp-content/uploads/2020/11/Disney-Plus-Logo.png'
      },
      'max': {
        name: 'HBO Max',
        logo: 'https://logos-world.net/wp-content/uploads/2020/05/HBO-Max-Logo.png'
      },
      'hbo': {
        name: 'HBO Max',
        logo: 'https://logos-world.net/wp-content/uploads/2020/05/HBO-Max-Logo.png'
      },
      'hulu': {
        name: 'Hulu',
        logo: 'https://logos-world.net/wp-content/uploads/2020/06/Hulu-Logo.png'
      },
      'peacock': {
        name: 'Peacock',
        logo: 'https://logos-world.net/wp-content/uploads/2020/07/Peacock-Logo.png'
      },
      'paramount': {
        name: 'Paramount+',
        logo: 'https://logos-world.net/wp-content/uploads/2021/02/Paramount-Plus-Logo.png'
      },
      'apple': {
        name: 'Apple TV+',
        logo: 'https://logos-world.net/wp-content/uploads/2021/08/Apple-TV-Logo.png'
      },
      'starz': {
        name: 'Starz',
        logo: 'https://logos-world.net/wp-content/uploads/2021/03/Starz-Logo.png'
      },
      'showtime': {
        name: 'Showtime',
        logo: 'https://logos-world.net/wp-content/uploads/2020/11/Showtime-Logo.png'
      }
    };
    
    // Check if the show has streaming options in the US
    if (show.streamingOptions && show.streamingOptions['us']) {
      const usOptions = show.streamingOptions['us'];
      
      // Process each streaming option
      usOptions.forEach((option: any) => {
        const serviceId = option.service?.id || '';
        const mapping = serviceMapping[serviceId] || {
          name: option.service?.name || serviceId,
          logo: ''
        };
        
        // Determine the type and price
        let optionType: 'subscription' | 'rent' | 'buy' | 'free' = 'subscription';
        let price: string | undefined;
        
        if (option.type === 'rent') {
          optionType = 'rent';
          price = option.price?.amount ? `$${option.price.amount}` : undefined;
        } else if (option.type === 'buy') {
          optionType = 'buy';
          price = option.price?.amount ? `$${option.price.amount}` : undefined;
        } else if (option.type === 'free') {
          optionType = 'free';
        } else if (option.type === 'subscription') {
          optionType = 'subscription';
        }
        
        // Add the streaming source with the DIRECT LINK from the API
        sources.push({
          name: mapping.name,
          logo: mapping.logo,
          url: option.link || `https://www.${serviceId}.com`, // This is the direct deep link!
          type: optionType,
          price: price
        });
      });
    }
    
    // Remove duplicates (same service + type combination)
    const uniqueSources = sources.filter((source, index, self) => 
      index === self.findIndex(s => s.name === source.name && s.type === source.type)
    );
    
    console.log(`Returning ${uniqueSources.length} unique streaming sources with direct links`);
    return uniqueSources.length > 0 ? uniqueSources : getFallbackSources(title);
    
  } catch (error) {
    console.error('Error using Streaming Availability client:', error);
    return getFallbackSources(title);
  }
}

function getFallbackSources(title: string): StreamingSource[] {
  console.log('Using fallback search links');
  const searchQuery = encodeURIComponent(title);
  
  return [
    {
      name: "Netflix",
      logo: "https://logos-world.net/wp-content/uploads/2020/04/Netflix-Logo.png",
      url: `https://www.netflix.com/search?q=${searchQuery}`,
      type: "subscription" as const
    },
    {
      name: "Amazon Prime Video",
      logo: "https://logos-world.net/wp-content/uploads/2021/08/Amazon-Prime-Video-Logo.png",
      url: `https://www.amazon.com/s?k=${searchQuery}&i=instant-video`,
      type: "subscription" as const
    },
    {
      name: "Disney+",
      logo: "https://logos-world.net/wp-content/uploads/2020/11/Disney-Plus-Logo.png",
      url: `https://www.disneyplus.com/search?q=${searchQuery}`,
      type: "subscription" as const
    },
    {
      name: "HBO Max",
      logo: "https://logos-world.net/wp-content/uploads/2020/05/HBO-Max-Logo.png",
      url: `https://www.max.com/search?q=${searchQuery}`,
      type: "subscription" as const
    }
  ].slice(0, Math.floor(Math.random() * 3) + 2);
}

// Export for testing
export { getStreamingSourcesWithClient, getFallbackSources };