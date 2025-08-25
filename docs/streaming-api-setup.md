# Setting Up Real Streaming Links with Streaming Availability API

## Overview
The application now integrates with the Streaming Availability API from RapidAPI to provide direct deep links to streaming platforms instead of search results pages.

## Setup Instructions

### 1. Get a RapidAPI Key
1. Go to [RapidAPI Streaming Availability](https://rapidapi.com/movie-of-the-night-movie-of-the-night-default/api/streaming-availability)
2. Sign up for a free account
3. Subscribe to the API (free tier available)
4. Copy your API key from the dashboard

### 2. Add the API Key to Supabase
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard/project/mrkcgfsbdcukufgwvjap)
2. Navigate to **Edge Functions** in the sidebar
3. Click on **search-content** function
4. Go to the **Settings** tab
5. Add a new environment variable:
   - Name: `STREAMING_AVAILABILITY_API_KEY`
   - Value: Your RapidAPI key (e.g., `ce60f1a86bmshd4fe91f2ed5c2ffp1d72b8jsn3e0ee0d6e66e`)
6. Click **Save**

### 3. How It Works

The updated `getStreamingSources` function now:
1. **Searches for the title** using the Streaming Availability API
2. **Gets actual streaming availability** for US services
3. **Returns direct deep links** to the content on each platform
4. **Includes pricing info** for rental/purchase options
5. **Falls back to search links** if the API fails or no key is provided

### API Response Structure

The API provides comprehensive streaming data:
```javascript
{
  "result": [{
    "title": "Inception",
    "streamingInfo": {
      "us": {
        "netflix": {
          "link": "https://www.netflix.com/title/70131314",  // Direct link!
          "subscription": {
            "link": "https://www.netflix.com/title/70131314"
          }
        },
        "prime": {
          "link": "https://www.amazon.com/gp/video/detail/B0047WJ12K",
          "rent": {
            "link": "https://www.amazon.com/gp/video/detail/B0047WJ12K",
            "price": 3.99
          },
          "buy": {
            "link": "https://www.amazon.com/gp/video/detail/B0047WJ12K",
            "price": 12.99
          }
        }
      }
    }
  }]
}
```

### Supported Streaming Services

The API supports direct links for:
- Netflix
- Amazon Prime Video
- Disney+
- HBO Max (Max)
- Hulu
- Apple TV+
- Peacock
- Paramount+
- Starz
- Showtime
- And many more...

### Testing the Integration

Use the test script to verify the API is working:
```bash
node test-search-local.js "Inception"
```

Check the output for direct streaming links like:
- Netflix: `https://www.netflix.com/title/70131314` ✅
- Not: `https://www.netflix.com/search?q=Inception` ❌

### Troubleshooting

1. **Still seeing search links?**
   - Make sure the environment variable is set in Supabase
   - Check the Edge Function logs for API errors
   - Verify your RapidAPI key is valid and has access

2. **No streaming sources found?**
   - The content might not be available on any US streaming services
   - Try a popular movie/show to test
   - Check the API response in the logs

3. **API errors?**
   - Check your RapidAPI subscription status
   - Verify the API key is correct
   - Check rate limits (free tier has limits)

### API Limits

Free tier typically includes:
- 100 requests per month
- Basic streaming availability data
- US market only

For production use, consider upgrading to a paid plan for:
- More requests
- Multiple countries
- Faster response times
- Priority support