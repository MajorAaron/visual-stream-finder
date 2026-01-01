# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Visual Stream Finder is a React-based web application that identifies movies/TV shows from images or text and helps users find streaming platforms. It uses AI vision analysis and integrates with multiple streaming APIs.

## Development Commands

```bash
# Install dependencies
npm install

# Run development server (Vite on http://localhost:8080)
npm run dev

# Build for production
npm run build

# Run ESLint
npm run lint

# Preview production build
npm run preview

# Deploy to GitHub Pages
npm run deploy
```

## Local Development with Supabase

```bash
# Start local Supabase stack
npx supabase start

# Serve edge functions locally
npx supabase functions serve --env-file supabase/functions/.env

# Stop Supabase
npx supabase stop
```

### Local Service URLs
- **App**: http://localhost:8080
- **Supabase Studio**: http://127.0.0.1:54323
- **Inbucket (Email Testing)**: http://127.0.0.1:54324
- **API**: http://127.0.0.1:54321
- **Database**: postgresql://postgres:postgres@127.0.0.1:54322/postgres

## Architecture

### Frontend Stack
- **React 18** with **TypeScript**
- **Vite** as build tool (dev server runs on port 8080)
- **Tailwind CSS** for styling
- **shadcn/ui** component library (in src/components/ui/)
- **React Router** (HashRouter for GitHub Pages)
- **React Query** for data fetching and caching

### Backend Services
- **Supabase** (BaaS) - Authentication, database, caching, and edge functions
- **OpenAI API** - Content identification using gpt-4o-mini (cost-optimized)
- **TMDB API** - Movie/TV metadata, posters, and multi-search
- **YouTube Data API** - Video identification
- ~~**Firecrawl API**~~ - Removed (using simple HTML fetch instead)
- **Streaming Availability API** - **ENABLED** - Provides deep links directly to Netflix, Hulu, Apple TV+, etc.

### Key Directories
- `src/pages/` - Main application pages (Index, Auth, Profile, Watchlist, Watched)
- `src/components/` - React components
- `src/hooks/` - Custom React hooks (useAuth, useWatchlist)
- `src/integrations/supabase/` - Supabase client and types
- `src/utils/` - Business logic (aiAnalysis, watchlistService)
- `supabase/functions/` - Edge functions for AI processing

## Data Flow Architecture

### Unified Search Pipeline (Optimized - 96% Cost Reduction)
1. **Frontend**: SearchInput.tsx handles both image upload and text input
2. **Edge Function**: unified-search processes through intelligent waterfall:
   - **Layer 1 (FREE)**: Cache lookup → TMDB multi-search → YouTube direct API
   - **Layer 2 (CHEAP)**: gpt-4o-mini for AI analysis (only if Layer 1 fails)
   - **Layer 3 (ENRICH)**: TMDB posters + JustWatch/Reelgood smart links
3. **Display**: ResultsDisplay.tsx shows streaming options via aggregator links
4. **Caching**: All results stored in `search_cache` table (90-day TTL)

**Key Optimizations:**
- 40-50% of searches served from cache (instant, $0 cost)
- 30-40% skip AI via TMDB direct match
- Only 20-30% require AI (using cheap gpt-4o-mini)
- No paid streaming APIs (replaced with free aggregator links)

See [Unified Search Documentation](/docs/edge-functions/unified-search.md) for details.

### Authentication Flow
- Multi-provider support (Email, Google, GitHub, Discord)
- Protected routes via ProtectedRoute component
- Automatic profile creation on signup (database trigger)
- Row Level Security (RLS) on all database tables

### Watchlist Implementation
- Dual state: `watched: false` (watchlist) vs `watched: true` (watched)
- CRUD operations in utils/watchlistService.ts
- Real-time sync via Supabase subscriptions
- Unique constraints prevent duplicates

## Architecture Documentation

For detailed visual diagrams and comprehensive architecture documentation:

- [Search Workflow Architecture](/docs/search-workflow-architecture.md) - Complete search flow diagrams (flowchart + sequence), API interactions, and performance considerations

## Database Schema

```sql
profiles
├── id (UUID)
├── user_id (FK to auth.users)
├── display_name, avatar_url
└── timestamps

watchlist
├── id (UUID)
├── user_id (FK to auth.users)
├── title, year, type, genre[]
├── streaming_sources (JSONB)
├── watched (boolean)
└── confidence, timestamps

search_cache (NEW - Cost Optimization)
├── id (UUID)
├── input_hash (TEXT, UNIQUE) - SHA256 of search input
├── content_type ('image' | 'text' | 'url')
├── identified_title, identified_year, identified_type
├── tmdb_id, tmdb_poster_url
├── youtube_id, youtube_url, channel_name
├── confidence, plot, genre[], rating, runtime
├── hit_count (tracks popularity)
└── created_at, last_accessed_at (90-day TTL)
```

## Code Conventions

- TypeScript in non-strict mode for flexibility
- Tailwind CSS for all styling (no separate CSS files)
- shadcn/ui components follow the pattern in src/components/ui/
- API calls go through Supabase edge functions
- Use React Query for data fetching
- Error handling with toast notifications (sonner)
- Path alias: `@/` maps to `./src/`

## Testing & Validation

No test framework is currently configured. To verify changes:
1. Run `npm run lint` to check for ESLint errors
2. Run `npm run build` to ensure TypeScript compilation succeeds
3. Test functionality in development with `npm run dev`

## Environment Variables

The app uses Supabase environment variables. Key services require API keys:
- **OpenAI API** (gpt-4o-mini for cost-optimized content identification)
- **TMDB API** (movie/TV data, posters, and multi-search)
- **YouTube Data API** (video identification)
- ~~**Firecrawl API**~~ (disabled - using simple HTML fetch)
- **Streaming Availability API** (ENABLED - provides deep links to streaming platforms)

These are configured in the Supabase dashboard and `supabase/functions/.env` for local development.

## Edge Functions

### Active Functions (Optimized Architecture)
- **`unified-search`** ⭐ - Primary search function with 96% cost reduction
  - Handles both image and text searches
  - Intelligent caching with 90-day TTL
  - Smart waterfall: Cache → TMDB → YouTube → AI → Enrichment
  - Uses gpt-4o-mini for all AI (10-30x cheaper than gpt-4o)
  - JustWatch/Reelgood aggregator links (no paid streaming API)
  - **See**: [Unified Search Documentation](/docs/edge-functions/unified-search.md)

### Legacy Functions (Backward Compatibility)
- `analyze-image` - Original image analysis (now wraps unified-search)
- `search-content` - Original text search (now wraps unified-search)

**Migration Note**: Frontend still works with old function calls via AIAnalysisService wrappers. All requests are automatically routed to unified-search for cost optimization.

## Features

### Web Share Target API

The app supports receiving shared content from other apps via the Web Share Target API:
- **Image Sharing**: Share images from Photos, Camera, or other apps directly to the app
- **Text Sharing**: Share movie titles, URLs, or text content
- **Automatic Search**: Shared content automatically triggers the search process
- **PWA Integration**: Appears in native share sheet when installed as PWA

For detailed documentation, see:
- [Web Share Target API Integration](/docs/features/web-share-target.md)

## Deployment

GitHub Pages deployment via GitHub Actions. When you push to the main branch, the workflow automatically:
1. Builds the project
2. Deploys directly to GitHub Pages (no separate gh-pages branch needed)
3. Site updates are live within 2-5 minutes after merge

**Important**: You need to configure GitHub Pages in repository settings:
- Go to Settings → Pages
- Source: GitHub Actions (not Deploy from a branch)
- The workflow handles everything else automatically

HashRouter is used for client-side routing compatibility with GitHub Pages.

## Important Notes

- **Local emails**: All test emails go to Inbucket at http://127.0.0.1:54324
- **No OAuth locally**: Google/GitHub login only works in production
- **Dev server port**: Runs on 8080, not the default 5173
- **No automated tests**: Manual testing workflow required
- **Path aliasing**: Use `@/` to import from src directory
- **HashRouter**: Required for GitHub Pages - all internal navigation uses hash-based routing

## Required Environment Variables

Create `supabase/functions/.env` for local development:
```
OPENAI_API_KEY="your_openai_api_key"
TMDB_API_KEY="your_tmdb_api_key"
YOUTUBE_API_KEY="your_youtube_api_key"
STREAMING_AVAILABILITY_API_KEY="your_streaming_availability_api_key"
```