# Search Workflow Architecture

This document provides a comprehensive overview of the Visual Stream Finder search architecture, including all input types, processing paths, and API integrations.

## Overview

Visual Stream Finder supports multiple search input methods, each with its own optimized processing pipeline:

1. **Image Upload** - File picker for image selection
2. **Camera Capture** - Direct camera access for real-time photos
3. **Text Search** - Plain text queries for movie/TV titles
4. **URL Input** - URLs from IMDb, streaming platforms, YouTube, etc.
5. **Web Share** - Integration with native share functionality

All search methods ultimately route through one of two edge functions:
- `analyze-image` - Optimized for visual content analysis
- `search-content` - Optimized for text/URL processing

## Complete Search Flow Diagram

```mermaid
flowchart TD
    Start([User Input]) --> InputType{Input Type?}

    %% Image Upload Path
    InputType -->|Image Upload| ImgUpload[SearchInput: File Picker]
    InputType -->|Camera| Camera[SearchInput: Camera Capture]
    InputType -->|Text| TextInput[SearchInput: Text Field]
    InputType -->|URL| URLInput[SearchInput: URL in Text Field]
    InputType -->|Web Share| WebShare[useShareHandler: Shared Content]

    ImgUpload --> ImgValidation{Validate Image}
    Camera --> ImgValidation
    WebShare -->|Image| ImgValidation

    ImgValidation -->|Valid<br/>Max 10MB<br/>JPEG/PNG/WebP| IndexImg[Index.tsx:<br/>handleImageUpload]
    ImgValidation -->|Invalid| Error1[Show Error Toast]

    IndexImg --> AnalyzeImageAPI[Edge Function:<br/>analyze-image]

    %% Analyze Image Processing
    AnalyzeImageAPI --> OpenAIVision[OpenAI Vision API<br/>gpt-4o model]
    OpenAIVision --> ParseVision{Parse Results}

    ParseVision -->|For Each Item| ItemType{Content Type?}

    ItemType -->|YouTube| YT1[YouTube Data API<br/>Get video details]
    ItemType -->|Movie/TV/Doc| TMDB1[TMDB API<br/>Get poster]

    TMDB1 --> Stream1[Streaming Availability API<br/>Get real sources]
    Stream1 --> Results1[Combine Results]
    YT1 --> Results1

    %% Text/URL Path
    TextInput --> IndexText[Index.tsx:<br/>handleTextSearch]
    URLInput --> IndexText
    WebShare -->|Text/URL| IndexText

    IndexText --> SearchContentAPI[Edge Function:<br/>search-content]

    SearchContentAPI --> URLCheck{Is URL?}

    URLCheck -->|Yes| ExtractHTML[Fetch HTML<br/>Extract title/meta/content]
    URLCheck -->|No| DirectText[Use text directly]

    ExtractHTML --> YTCheck{YouTube URL?}
    DirectText --> YTCheck

    YTCheck -->|Yes| YT2[YouTube Data API<br/>Get video metadata]
    YTCheck -->|No| OpenAIChat[OpenAI Chat API<br/>gpt-4o-mini<br/>Content identification]

    OpenAIChat --> EnrichPoster[TMDB API<br/>Enrich with posters]
    EnrichPoster --> EnrichStream{Content Type?}

    EnrichStream -->|Movie/TV| Stream2[Streaming Availability API<br/>Get sources]
    EnrichStream -->|YouTube| YT3[YouTube metadata]
    EnrichStream -->|No data| Fallback[Generate search URLs]

    Stream2 --> Results2[Combine Results]
    YT2 --> Results2
    YT3 --> Results2
    Fallback --> Results2

    %% Display
    Results1 --> Display[ResultsDisplay.tsx<br/>Show streaming options]
    Results2 --> Display

    Display --> Watchlist[Check Watchlist Status<br/>Show Add/Remove buttons]

    %% Styling - Colorful theme with high contrast text
    classDef input fill:#4FC3F7,stroke:#0277BD,stroke-width:3px,color:#000
    classDef process fill:#FFB74D,stroke:#E65100,stroke-width:3px,color:#000
    classDef api fill:#9575CD,stroke:#4527A0,stroke-width:3px,color:#FFF
    classDef result fill:#81C784,stroke:#2E7D32,stroke-width:3px,color:#000
    classDef error fill:#E57373,stroke:#C62828,stroke-width:3px,color:#FFF

    class ImgUpload,Camera,TextInput,URLInput,WebShare input
    class IndexImg,IndexText,SearchContentAPI,AnalyzeImageAPI process
    class OpenAIVision,OpenAIChat,YT1,YT2,YT3,TMDB1,Stream1,Stream2,ExtractHTML api
    class Display,Watchlist,Results1,Results2 result
    class Error1 error
```

## Detailed API Interaction Sequence

```mermaid
sequenceDiagram
    participant U as User
    participant SI as SearchInput
    participant Idx as Index.tsx
    participant AIS as aiAnalysis.ts
    participant AIE as analyze-image<br/>(Edge Function)
    participant SCE as search-content<br/>(Edge Function)
    participant OAI as OpenAI API
    participant YT as YouTube API
    participant TMDB as TMDB API
    participant SA as Streaming<br/>Availability API
    participant RD as ResultsDisplay

    rect rgb(129, 212, 250)
        Note over U,SI: IMAGE UPLOAD FLOW
        U->>SI: Upload image/Take photo
        SI->>SI: Validate (10MB, JPEG/PNG/WebP)
        SI->>Idx: handleImageUpload(file)
        Idx->>AIS: analyzeImage(base64)
        AIS->>AIE: POST /analyze-image
        AIE->>OAI: Vision API (gpt-4o)
        OAI-->>AIE: {title, year, type, genre, confidence}

        par For each detected item
            alt YouTube video
                AIE->>YT: Search & get details
                YT-->>AIE: {title, thumbnail, channel}
            else Movie/TV/Doc
                AIE->>TMDB: Search by title+year
                TMDB-->>AIE: {poster_path}
                AIE->>SA: Search streaming sources
                SA-->>AIE: {services[]}
            end
        end

        AIE-->>AIS: Combined results
        AIS-->>Idx: ContentItem[]
        Idx->>RD: Display results
    end

    rect rgb(255, 183, 77)
        Note over U,SI: TEXT/URL SEARCH FLOW
        U->>SI: Enter text or URL
        SI->>Idx: handleTextSearch(text)
        Idx->>AIS: searchByText(query)
        AIS->>SCE: POST /search-content

        alt URL provided
            SCE->>SCE: Fetch HTML, extract content

            alt YouTube URL detected
                SCE->>YT: Get video by ID
                YT-->>SCE: Video metadata
                SCE-->>AIS: YouTube result
            else Other URL/Text
                SCE->>OAI: Chat API (gpt-4o-mini)
                OAI-->>SCE: {title, type, year, sources}
                SCE->>TMDB: Get poster
                TMDB-->>SCE: poster_path

                alt Movie/TV identified
                    SCE->>SA: Get streaming sources
                    SA-->>SCE: {services[]}
                else No data
                    SCE->>SCE: Generate fallback URLs
                end

                SCE-->>AIS: Enriched results
            end
        else Plain text
            SCE->>OAI: Chat API (gpt-4o-mini)
            OAI-->>SCE: {title, type, year}
            SCE->>TMDB: Get poster
            TMDB-->>SCE: poster_path
            SCE->>SA: Get streaming sources
            SA-->>SCE: {services[]}
            SCE-->>AIS: Enriched results
        end

        AIS-->>Idx: ContentItem[]
        Idx->>RD: Display results
    end

    rect rgb(129, 199, 132)
        Note over RD: DISPLAY & WATCHLIST
        RD->>RD: Check watchlist status
        RD->>U: Show streaming options
    end
```

## Key Differences Between Search Paths

### Image Upload/Camera → `analyze-image` Edge Function

**Characteristics:**
- **AI Model**: OpenAI Vision (gpt-4o) - Premium model optimized for image understanding
- **Cost**: Higher per request (~$0.01-0.03 per image)
- **Confidence**: Returns scores from 0.6 to 1.0 based on visual clarity
- **Processing**: Can detect multiple items in a single image (parallel processing)
- **Use Cases**: Screenshots, photos of posters, TV screens, promotional materials

**API Call Sequence:**
1. OpenAI Vision API for content identification
2. For YouTube content: YouTube Data API (search + details)
3. For movies/TV: TMDB API (posters) + Streaming Availability API (sources)

**Files:**
- Frontend: `src/components/SearchInput.tsx` (lines 98-136)
- Controller: `src/pages/Index.tsx` (handleImageUpload, lines 42-76)
- Edge Function: `supabase/functions/analyze-image/index.ts`

### Text/URL Input → `search-content` Edge Function

**Characteristics:**
- **AI Model**: OpenAI Chat (gpt-4o-mini) - Cost-effective model for text processing
- **Cost**: Lower per request (~$0.001-0.003 per query)
- **Confidence**: Maps text confidence (high/medium/low) to 0.95/0.8/0.6
- **Processing**: Single item per request, but faster response times
- **Use Cases**: Title searches, IMDb links, streaming platform URLs, YouTube URLs

**Special Features:**
- **URL Detection**: Regex pattern `/^https?:\/\/.+/` automatically extracts web content
- **YouTube Optimization**: Direct video ID extraction from YouTube URLs bypasses AI analysis
- **HTML Parsing**: Extracts `<title>`, `<meta description>`, and first 2000 chars for context
- **Fallback Strategy**: Generates search URLs when streaming APIs return no data

**API Call Sequence:**
1. If URL: Fetch HTML content
2. If YouTube URL: Direct YouTube Data API call (skip AI)
3. Otherwise: OpenAI Chat API for identification
4. TMDB API for poster enrichment
5. Streaming Availability API for sources (or generate fallback URLs)

**Files:**
- Frontend: `src/components/SearchInput.tsx` (lines 138-152)
- Controller: `src/pages/Index.tsx` (handleTextSearch, lines 78-112)
- Edge Function: `supabase/functions/search-content/index.ts`

### Web Share Integration → Routes to Appropriate Handler

**Characteristics:**
- **Platform Support**: iOS Safari, Android Chrome, native mobile apps
- **Content Types**: Handles both shared images and shared text/URLs
- **Routing**: Automatically detects content type and routes to correct edge function

**Files:**
- Hook: `src/hooks/useShareHandler.ts`
- Controller: `src/pages/Index.tsx` (lines 120-146)

## API Reference

| API | Edge Function | Purpose | Authentication | Rate Limits |
|-----|---------------|---------|----------------|-------------|
| **OpenAI Vision API** | analyze-image | Image content identification | `OPENAI_API_KEY` | Token-based pricing |
| **OpenAI Chat API** | search-content | Text content identification | `OPENAI_API_KEY` | Token-based pricing |
| **YouTube Data API v3** | Both | Video metadata & thumbnails | `YOUTUBE_API_KEY` | 10,000 units/day |
| **TMDB API v3** | Both | Movie/TV posters | `TMDB_API_KEY` | 50 requests/sec |
| **Streaming Availability** | Both | Real streaming platform data | `STREAMING_AVAILABILITY_API_KEY` (RapidAPI) | Plan-dependent |

## Component Architecture

### Frontend Layer

| Component | Responsibility | Key Methods |
|-----------|----------------|-------------|
| `SearchInput.tsx` | User input handling | `onImageUpload`, `onTextSearch`, camera controls |
| `Index.tsx` | Request routing | `handleImageUpload`, `handleTextSearch` |
| `ResultsDisplay.tsx` | Results presentation | Watchlist integration, streaming links |
| `useShareHandler.ts` | Web Share API | Parse shared content, route to handlers |

### Service Layer

| Service | Responsibility | Methods |
|---------|----------------|---------|
| `aiAnalysis.ts` | API client for edge functions | `analyzeImage()`, `searchByText()` |
| `watchlistService.ts` | Watchlist CRUD operations | Add, remove, toggle watched status |

### Edge Functions

| Function | Primary Use | Secondary Features |
|----------|-------------|-------------------|
| `analyze-image` | Visual content analysis | Multi-item detection, parallel processing |
| `search-content` | Text/URL processing | YouTube optimization, HTML extraction, fallback generation |

## Validation & Error Handling

### Image Upload Validation
```typescript
// src/components/SearchInput.tsx (lines 98-111)
- Max file size: 10MB
- Allowed formats: JPEG, PNG, WebP
- Base64 encoding validation in edge function
```

### URL Detection
```typescript
// src/components/SearchInput.tsx (line 145)
const urlRegex = /^https?:\/\/.+/
// Matches: http://, https:// followed by any characters
```

### Confidence Score Mapping
```typescript
// analyze-image: 0.6 to 1.0 (from AI model)
// search-content:
//   - "high" → 0.95
//   - "medium" → 0.8
//   - "low" → 0.6
```

## Performance Considerations

### Image Path Optimizations
- **Parallel Processing**: Multiple detected items processed simultaneously
- **Image Compression**: 10MB limit balances quality with upload speed
- **Base64 Caching**: Client-side preview prevents redundant encoding

### Text Path Optimizations
- **YouTube Fast Path**: Direct API call for YouTube URLs (bypasses AI analysis)
- **Cost Efficiency**: Uses gpt-4o-mini instead of gpt-4o (10x cheaper)
- **Graceful Degradation**: Fallback URLs generated when APIs fail
- **HTML Extraction**: Limited to 2000 chars to reduce token usage

## Future Enhancement Opportunities

Based on the current architecture, potential improvements include:

1. **Caching Layer**: Redis/CloudFlare cache for repeated searches
2. **Batch Processing**: Multiple images in single request
3. **Streaming Results**: Progressive UI updates as APIs respond
4. **Offline Mode**: Cache recent searches for offline access
5. **A/B Testing**: Compare gpt-4o vs gpt-4o-mini accuracy for images

## Related Documentation

- [Analyze Image Edge Function](/docs/edge-functions/analyze-image.md)
- [Search Content Edge Function](/docs/edge-functions/search-content.md)
- [Search Content OpenAI Integration](/docs/edge-functions/search-content-update.md)
- [Search Content Logging Improvements](/docs/edge-functions/search-content-logging-improvement.md)
