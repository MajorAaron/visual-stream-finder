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
- **Supabase** (BaaS) - Authentication, database, and edge functions
- **OpenAI Vision API** - Image content identification
- **TMDB API** - Movie/TV metadata
- **YouTube Data API** - Video identification
- **Streaming Availability API** - Platform availability

### Key Directories
- `src/pages/` - Main application pages (Index, Auth, Profile, Watchlist, Watched)
- `src/components/` - React components
- `src/hooks/` - Custom React hooks (useAuth, useWatchlist)
- `src/integrations/supabase/` - Supabase client and types
- `src/utils/` - Business logic (aiAnalysis, watchlistService)
- `supabase/functions/` - Edge functions for AI processing

## Data Flow Architecture

### Image Analysis Pipeline
1. **Frontend**: SearchInput.tsx handles image upload/text input
2. **Edge Function**: analyze-image processes through:
   - OpenAI Vision API for content identification
   - TMDB API for metadata and posters
   - Streaming Availability API for platform data
   - YouTube Data API for video content
3. **Display**: ResultsDisplay.tsx shows streaming options

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
- OpenAI API (for vision analysis)
- TMDB API (for movie/TV data)
- YouTube Data API (for video identification)
- Streaming Availability API (for platform data)
- Firecrawl API (for web scraping)

These are configured in the Supabase dashboard, not in local .env files.

## Edge Functions

- `analyze-image` - Processes uploaded images with OpenAI Vision
- `search-content` - Handles text-based content search

For detailed documentation on edge functions, see:
- [Analyze Image Function Documentation](/docs/edge-functions/analyze-image.md)
- [Search Content Function Documentation](/docs/edge-functions/search-content.md)

## Deployment

GitHub Pages deployment via GitHub Actions. The main branch auto-deploys using the gh-pages package. HashRouter is used for client-side routing compatibility.

## Important Notes

- **Local emails**: All test emails go to Inbucket at http://127.0.0.1:54324
- **No OAuth locally**: Google/GitHub login only works in production
- **Dev server port**: Runs on 8080, not the default 5173
- **No automated tests**: Manual testing workflow required
- **Path aliasing**: Use `@/` to import from src directory