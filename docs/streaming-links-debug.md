# Streaming Links Debug Guide

## Issue
The streaming links were going to generic homepages (e.g., netflix.com) instead of search results or specific content pages.

## Root Cause
The `getStreamingSources` function in `/supabase/functions/search-content/index.ts` was returning mock data with generic URLs instead of generating proper search links for each streaming service.

## Solution Implemented

### 1. Fixed URL Generation
Updated the `getStreamingSources` function to generate search-based deep links for each streaming service:

```typescript
// Before (generic URLs):
url: "https://netflix.com"

// After (search-based URLs):
url: `https://www.netflix.com/search?q=${encodeURIComponent(title)}`
```

### 2. Added Console Logging
Added console logging in both frontend and backend to help debug streaming link issues:

#### Frontend Logging (Browser Console)
- `ResultsDisplay.tsx`: Logs when rendering streaming services and when links are clicked
- `Watchlist.tsx`: Logs streaming service URLs when rendered and clicked

#### Backend Logging (Supabase Logs)
- `search-content/index.ts`: Logs when generating streaming sources

## How to View Logs

### Browser Console
1. Open Chrome DevTools (F12 or right-click → Inspect)
2. Go to the "Console" tab
3. Search for content or view your watchlist
4. Look for messages like:
   - `Streaming service Netflix: https://www.netflix.com/search?q=...`
   - `Opening streaming link: https://www.netflix.com/search?q=...`

### Supabase Edge Function Logs
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to "Edge Functions" in the sidebar
4. Click on "search-content" function
5. Click on "Logs" tab
6. You'll see logs like:
   - `Getting streaming sources for: [title] ([year]) - [type]`
   - `Returning X streaming sources with search links`

## Deploying the Changes

To deploy the updated edge function to Supabase:

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Deploy the edge function
supabase functions deploy search-content --project-ref mrkcgfsbdcukufgwvjap
```

Alternatively, if you're using the Supabase GitHub integration, push the changes to your repository and they will auto-deploy.

## Current Streaming Services Supported

The following services now have search-based deep links:
- Netflix: `https://www.netflix.com/search?q=[title]`
- Amazon Prime Video: `https://www.amazon.com/s?k=[title]&i=instant-video`
- Apple TV+: `https://tv.apple.com/search?term=[title]`
- Hulu: `https://www.hulu.com/search?q=[title]`
- Disney+: `https://www.disneyplus.com/search?q=[title]`
- HBO Max: `https://www.max.com/search?q=[title]`
- Peacock: `https://www.peacocktv.com/search?q=[title]`
- Paramount+: `https://www.paramountplus.com/search?q=[title]`

## Future Improvements

1. **Use Real Streaming Availability API**: Currently using mock data. Should integrate with a real API like:
   - [Streaming Availability API](https://www.movieofthenight.com/about/api)
   - [JustWatch API](https://www.justwatch.com)
   - [Watchmode API](https://api.watchmode.com)

2. **Direct Deep Links**: Instead of search URLs, get direct links to content pages when available

3. **Region-Specific Availability**: Show only services available in the user's region

4. **Pricing Information**: Show actual rental/purchase prices from the APIs

## Testing
1. Upload an image or search for content
2. Check browser console for the generated URLs
3. Click on streaming service buttons
4. Verify they go to search results instead of homepage