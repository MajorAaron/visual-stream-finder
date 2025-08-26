# Search Content Edge Function

## Overview

The `search-content` edge function is an intelligent content discovery service that identifies movies and TV shows through text queries or streaming platform URLs. It leverages OpenAI's web search capabilities to provide real-time streaming availability and combines it with TMDB for rich metadata and poster images.

## Purpose

This function provides flexible content discovery through multiple pathways:

- **Text Search**: AI-powered content identification with fuzzy matching
- **URL Intelligence**: Automatic content extraction from streaming platform URLs
- **OpenAI Web Search**: Real-time streaming availability using OpenAI's web search tool
- **TMDB Integration**: High-quality metadata and poster images from The Movie Database

## Architecture

### Function Flow

```mermaid
graph TD
    A[User Input] --> B{Input Type?}
    B -->|URL| C[URL Detection]
    B -->|Text| D[OpenAI Content ID]
    
    C --> E[Firecrawl Scraping]
    E --> F[OpenAI Extraction]
    F --> G[Content Identification]
    
    C --> H[HTML Parsing]
    H --> G
    
    D --> I[OpenAI Web Search]
    I --> J[Streaming Sources]
    G --> K[TMDB Poster Lookup]
    J --> K
    
    K --> L[Enriched Results]
    L --> M[Client Response]
```

### Search Strategy Hierarchy

1. **Text Search**: OpenAI-powered content identification with web search for streaming sources
2. **URL Processing**: Firecrawl + AI extraction with streaming source identification
3. **Fallback HTML**: Platform-specific parsers for URL content
4. **TMDB Enhancement**: Poster images and metadata from The Movie Database

## API Integrations

### OpenAI API

**Purpose**: Primary content identification and streaming source discovery

**Models Used**:
- `gpt-4o` - For content identification and streaming source finding
- Max tokens: 1000-1500 depending on task
- Temperature: 0.1 (focused responses)

**Features**:
- Natural language content identification from partial titles, descriptions, or URLs
- Intelligent streaming platform recommendations based on content type and licensing knowledge
- JSON-structured responses for reliable parsing
- High accuracy content matching with confidence scoring

**Streaming Source Strategy**:
- Platform-specific knowledge (e.g., Disney content on Disney+, HBO content on Max)
- Current availability based on training data and general patterns
- Search URL generation for major streaming platforms
- Type classification (subscription/rent/buy/free)

### TMDB API (The Movie Database)

**Purpose**: Metadata enhancement and poster image provider

**Endpoints Used**:
- `/3/search/movie` - Movie title search for poster lookup
- `/3/search/tv` - TV show title search for poster lookup

**Features**:
- High-quality poster images (500px width)
- Year-based matching for accurate poster selection
- Fallback search when exact matches aren't found
- Support for both movies and TV shows

### Firecrawl API

**Purpose**: Intelligent web scraping for URL analysis

**Configuration**:
```javascript
{
  formats: ['markdown', 'html'],
  onlyMainContent: true,
  timeout: 30000,
  waitFor: 2000
}
```

**Features**:
- JavaScript rendering support
- Main content extraction
- Markdown and HTML output
- Automatic wait for dynamic content

### OpenAI API (URL Processing)

**Purpose**: AI-powered content extraction from web pages (URL-based queries)

**Configuration**:
- Model: `gpt-4o-mini` (cost-optimized for URL processing)
- Max tokens: 600
- Temperature: 0.1 (focused responses)

**Task**: Extract structured movie/TV information from scraped content including streaming sources

## Supported Streaming Platforms

### URL Pattern Recognition

| Platform | URL Patterns | Extraction Method |
|----------|-------------|-------------------|
| Netflix | netflix.com/title/ | AI + HTML fallback |
| Prime Video | amazon.com/gp/video/, primevideo.com | AI + HTML fallback |
| Disney+ | disneyplus.com | AI extraction |
| HBO Max/Max | max.com, hbomax.com | Path-based + AI |
| Hulu | hulu.com | AI extraction |
| Peacock | peacocktv.com | AI extraction |
| Apple TV+ | tv.apple.com | AI extraction |
| Paramount+ | paramountplus.com | AI extraction |
| IMDB | imdb.com/title/ | Regex extraction |

### Platform-Specific Parsers

#### IMDB Parser
```javascript
// Extracts from URLs like: imdb.com/title/tt1234567/
const imdbId = url.match(/title\/(tt\d+)/)?.[1];
const title = html.match(/<title>([^(]+)/)?.[1];
const year = html.match(/\((\d{4})[^)]*\)/)?.[1];
```

#### HBO Max/Max Parser
```javascript
// Detects content type from URL path
const isMovie = url.includes('/feature/');
const isSeries = url.includes('/series/');
```

## Request/Response Format

### Request Schema

```typescript
interface SearchContentRequest {
  query: string;  // Text query or streaming platform URL
}
```

### Response Schema

```typescript
interface SearchContentResponse {
  results: ContentResult[];
}

interface ContentResult {
  title: string;
  year: number;
  type: 'movie' | 'tv' | 'documentary';
  genre: string[];
  rating: number;        // 0-10 scale
  runtime: string;       // Format: "XXm" or "X seasons"
  plot: string;
  poster: string;        // URL to poster image
  streamingSources: StreamingSource[];
  confidence: number;    // 0.7-0.9 scale
  releaseDate: string;
}

interface StreamingSource {
  name: string;          // Service name
  logo: string;          // Service logo URL
  url: string;           // Direct link or search URL
  type: 'subscription' | 'rent' | 'buy' | 'free';
  price?: string;        // For rent/buy options
}
```

## Environment Variables

```bash
# Required
OPENAI_API_KEY=sk-...                   # OpenAI API key for content identification
TMDB_API_KEY=...                        # TMDB API key for poster images

# Optional (for URL processing)
FIRECRAWL_API_KEY=...                   # Firecrawl API key for web scraping
```

## Search Strategies

### Text Query Processing

1. **OpenAI Content Identification**:
   - Natural language processing of user queries
   - Content type detection (movie vs TV show vs documentary)
   - Title extraction and normalization
   - Streaming platform recommendations

2. **Streaming Source Discovery**:
   - Platform-specific availability knowledge
   - Service type classification (subscription/rent/buy/free)
   - Direct search URL generation
   - Fallback to common streaming services

3. **TMDB Poster Lookup**:
   - Search TMDB using identified title and year
   - Prefer exact matches with year validation
   - High-quality poster image retrieval

### URL Processing Workflow

1. **Service Detection**:
   ```javascript
   const service = detectStreamingService(url);
   ```

2. **AI Extraction** (if Firecrawl available):
   ```javascript
   const scraped = await firecrawl.scrape(url);
   const extracted = await openai.extract(scraped);
   ```

3. **HTML Fallback**:
   ```javascript
   const parsed = await parseHTMLContent(html, service);
   ```

4. **TMDB Poster Lookup**:
   ```javascript
   const poster = await getTMDBPoster(extracted.title, extracted.year);
   ```

## Error Handling

### Cascading Fallback Strategy

```mermaid
graph TD
    A[URL Input] --> B{Firecrawl Available?}
    B -->|Yes| C[AI Extraction]
    B -->|No| D[HTML Parsing]
    C -->|Fail| D
    D -->|Fail| E[Title Search]
    E -->|Fail| F[Empty Results]
    
    C -->|Success| G[TMDB Enhancement]
    D -->|Success| G
    E -->|Success| G
    G --> H[Return Results]
    F --> I[Fallback Sources]
    I --> H
```

### Error Responses

| Error Type | Status | Response |
|------------|--------|----------|
| Missing query | 400 | "Query parameter is required" |
| API failure | 200 | Empty results array |
| Parse error | 200 | Fallback to next strategy |
| Timeout | 200 | Partial results returned |

## Performance Optimizations

### Caching Strategy
- No server-side caching (stateless)
- Client-side React Query caching
- Browser URL result caching

### Parallel Processing
- Concurrent TMDB movie/TV searches
- Simultaneous IMDB ID fetching
- Parallel streaming API calls

### Response Times
- Text search with OpenAI: 3-5 seconds
- URL with AI: 5-8 seconds
- URL with HTML: 2-3 seconds

## Usage Examples

### Text Search

```javascript
const searchByTitle = async (title) => {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/search-content`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        query: title
      })
    }
  );
  
  return response.json();
};

// Usage
const results = await searchByTitle("The Matrix");
```

### URL Search

```javascript
const searchByURL = async (streamingUrl) => {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/search-content`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        query: streamingUrl
      })
    }
  );
  
  return response.json();
};

// Usage
const results = await searchByURL("https://www.netflix.com/title/81234567");
```

## Testing

### Local Development

```bash
# Start Supabase
npx supabase start

# Set environment variables
export OPENAI_API_KEY=your_key     # Required
export TMDB_API_KEY=your_key       # Required
export FIRECRAWL_API_KEY=your_key  # Optional

# Serve function
npx supabase functions serve search-content --env-file ./supabase/.env.local

# Test text search
curl -X POST http://localhost:54321/functions/v1/search-content \
  -H "Content-Type: application/json" \
  -d '{"query": "Inception"}'

# Test URL search
curl -X POST http://localhost:54321/functions/v1/search-content \
  -H "Content-Type: application/json" \
  -d '{"query": "https://www.netflix.com/title/70131314"}'
```

### Test Scenarios

1. **Popular Movie**: Search for well-known titles
2. **TV Series**: Search for TV show names
3. **Netflix URL**: Test Netflix content extraction
4. **IMDB URL**: Test IMDB ID extraction
5. **Ambiguous Title**: Test deduplication
6. **New Release**: Test recent content
7. **Invalid URL**: Test error handling

## Advanced Features

### Intelligent Title Extraction

The function uses multiple strategies to extract titles:

1. **AI Understanding**: GPT-4 comprehends context
2. **Meta Tags**: Open Graph and Twitter cards
3. **JSON-LD**: Structured data extraction
4. **Regex Patterns**: Platform-specific patterns
5. **DOM Parsing**: Title element extraction

### Multi-Result Handling

When multiple matches are found:
- Returns up to 5 most relevant results
- Confidence scoring based on:
  - Title similarity
  - Year matching
  - Vote count
  - Popularity score

### Deep Linking

Generates platform-specific deep links:
- Direct content pages when available
- Search results as fallback
- Mobile app URLs where supported

## Limitations

1. **Streaming Data**: Based on OpenAI's training data and general patterns, not real-time API
2. **Region**: Primarily US-focused streaming recommendations
3. **Rate Limits**: Subject to OpenAI API quotas (500 requests/minute)
4. **AI Dependency**: Requires OpenAI API for core functionality
5. **Poster Availability**: Limited to content available in TMDB database

## Security Considerations

1. **Input Validation**: URL and query sanitization
2. **API Key Protection**: Server-side only
3. **CORS Policy**: Controlled access
4. **No Data Storage**: Stateless processing
5. **Error Masking**: Internal errors not exposed

## Monitoring & Debugging

### Key Metrics
- Search query distribution
- URL platform breakdown
- API success rates
- Response times by strategy

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| No results | Missing OpenAI key | Add OpenAI API key |
| Wrong content | Title ambiguity | Use more descriptive query |
| Slow response | AI processing | Normal for OpenAI API calls |
| Missing streaming | AI knowledge gap | Fallback sources provided |
| No poster | TMDB search failure | Title may not exist in TMDB |

## Future Enhancements

1. **Browser Extension**: Direct extraction from streaming tabs
2. **Batch Processing**: Multiple URLs in single request
3. **International Support**: Non-US streaming services
4. **Watch Party Links**: Generate shareable viewing sessions
5. **Price Tracking**: Historical pricing data
6. **Availability Alerts**: Notify when content becomes available

## Related Documentation

- [Analyze Image Function](./analyze-image.md) - Image-based search
- [Streaming Icons Configuration](../streaming-icons.md) - Service branding
- [Watchlist Service](../services/watchlist.md) - Content management