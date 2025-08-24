# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Visual Stream Finder is a React-based web application that identifies movies/TV shows from images or text and helps users find streaming platforms. It uses AI vision analysis and integrates with multiple streaming APIs.

## Development Commands

```bash
# Install dependencies
npm install

# Run development server (Vite on http://localhost:5173)
npm run dev

# Build for production
npm run build

# Run ESLint
npm run lint

# Preview production build
npm run preview
```

## Architecture

### Frontend Stack
- **React 18** with **TypeScript**
- **Vite** as build tool
- **Tailwind CSS** for styling
- **shadcn/ui** component library (in src/components/ui/)
- **React Router** for routing
- **React Query** for data fetching

### Backend Services
- **Supabase** (BaaS) - Authentication, database, and edge functions
- **OpenAI Vision API** - Image content identification
- **TMDB API** - Movie/TV metadata
- **YouTube Data API** - Video identification
- **Streaming Availability API** - Platform availability

### Key Directories
- `src/pages/` - Main application pages (Index, Auth, Watchlist, Watched)
- `src/components/` - React components
- `src/hooks/` - Custom React hooks
- `src/integrations/supabase/` - Supabase client and types
- `supabase/functions/` - Edge functions for AI processing

### Core Components
- **SearchInput.tsx** - Dual-mode search (image upload + text)
- **ResultsDisplay.tsx** - Display search results with streaming options
- **LoadingScreen.tsx** - Shows AI analysis progress

### Edge Functions
- `analyze-image` - Processes uploaded images with OpenAI Vision
- `search-content` - Handles text-based content search

## Code Conventions

- TypeScript strict mode enabled
- Tailwind CSS for all styling (no separate CSS files)
- shadcn/ui components follow the pattern in src/components/ui/
- API calls go through Supabase edge functions
- Use React Query for data fetching and caching
- Error handling with toast notifications (sonner)

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

These are configured in the Supabase dashboard, not in local .env files.

## Deployment

This is a Lovable project that auto-deploys from the main branch. Changes pushed to GitHub are automatically reflected in the Lovable platform.