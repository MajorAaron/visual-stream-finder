# Web Share Target API Integration

## Overview

Visual Stream Finder supports the Web Share Target API, allowing users to share images and text from other apps directly to our PWA. When content is shared, the app automatically starts the search process to identify the content and find streaming platforms.

## How It Works

### User Flow

1. **User shares content** from another app (Photos, YouTube, Safari, Chrome, etc.)
2. **Visual Stream Finder appears** in the native share sheet
3. **User selects the app** as the share target
4. **App opens automatically** to the search page
5. **Search starts immediately** with the shared content
6. **Results are displayed** showing streaming platforms

### Technical Flow

```
Other App (Share)
  ↓
Native Share Sheet
  ↓
Service Worker (/share-target endpoint)
  ↓
IndexedDB (unified storage for all content types)
  ↓
Redirect to /#/search?shared=image|text
  ↓
useShareHandler Hook (retrieves from IndexedDB)
  ↓
Index.tsx processes shared content
  ↓
Automatic search triggered
  ↓
Results displayed
```

## Supported Share Types

### 1. Images

**Supported formats:**
- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)
- WebP (.webp)
- BMP (.bmp)
- SVG (.svg)

**Process:**
1. Service worker receives POST request with image file
2. Converts image to base64 (chunked for large files)
3. Stores in IndexedDB with metadata and timestamp
4. Redirects to app with `/#/search?shared=image` (HashRouter compatible)
5. useShareHandler retrieves from IndexedDB
6. Converts back to File object
7. Calls `handleImageUpload()` in Index.tsx
8. AI Vision analysis begins automatically

### 2. Text & URLs

**Supported types:**
- Plain text (movie/TV show titles)
- URLs (YouTube, IMDb, Netflix, streaming platform URLs)
- Rich text with metadata

**Android URL Handling:**
On Android, the `url` field in the share data is often empty, and URLs come through the `text` field instead. The service worker automatically extracts URLs from the text field to handle this.

**Process:**
1. Service worker receives POST/GET request with text data
2. Extracts title, text, and URL parameters
3. Checks text field for URLs if url field is empty (Android compatibility)
4. Stores in IndexedDB (more reliable than query params for long URLs)
5. Redirects to app with `/#/search?shared=text` (HashRouter compatible)
6. useShareHandler retrieves from IndexedDB
7. Calls `handleTextSearch()` in Index.tsx
8. AI-powered search begins automatically

## Implementation Details

### Manifest Configuration

Location: [`public/manifest.json`](../../public/manifest.json)

```json
{
  "share_target": {
    "action": "./share-target",
    "method": "POST",
    "enctype": "multipart/form-data",
    "params": {
      "title": "title",
      "text": "text",
      "url": "url",
      "files": [
        {
          "name": "image",
          "accept": ["image/*", "image/jpeg", "image/png", "..."]
        }
      ]
    }
  }
}
```

### Service Worker Handler

Location: [`public/service-worker.js`](../../public/service-worker.js)

**Key functions:**
- `handleSharedContent(request)` - Processes POST requests (images, text, URLs)
- `handleSharedText(request)` - Processes GET requests (fallback for some apps)
- `storeSharedContent(data)` - Unified storage for all content types in IndexedDB
- `getLatestSharedContent()` - Retrieves the most recent shared content
- `clearSharedContent()` - Cleans up after processing
- `extractUrl(text)` - Extracts URLs from text (for Android compatibility)
- `arrayBufferToBase64(buffer)` - Chunked conversion for large images

**HashRouter Compatibility:**
The service worker redirects use hash-based routing (`/#/search?shared=...`) to work correctly with React Router's HashRouter, which is required for GitHub Pages deployment.

### Service Worker Registration

Location: [`src/utils/serviceWorkerRegistration.ts`](../../src/utils/serviceWorkerRegistration.ts)

**Key features:**
- Waits for service worker to be ready before accessing content
- Direct IndexedDB fallback if service worker controller isn't available
- Handles race conditions during initial page load
- Provides both new unified API and legacy compatibility

### Share Handler Hook

Location: [`src/hooks/useShareHandler.ts`](../../src/hooks/useShareHandler.ts)

**Responsibilities:**
- Detects share actions via query parameters in hash location
- Retrieves shared content from IndexedDB
- Parses both image and text content
- Provides shared content to components
- Cleans up URLs and storage after processing
- Shows toast notifications

### Search Page Integration

Location: [`src/pages/Index.tsx`](../../src/pages/Index.tsx)

**Key integration:**
```typescript
useEffect(() => {
  if (sharedContent) {
    if (sharedContent.type === 'image' && sharedContent.imageBase64) {
      // Convert base64 to File and trigger image analysis
      handleImageUpload(file);
      clearSharedContent();
    } else if (sharedContent.type === 'text' || sharedContent.type === 'url') {
      // Trigger text search (URL is prioritized over text)
      const searchQuery = sharedContent.url || sharedContent.text || '';
      handleTextSearch(searchQuery);
      clearSharedContent();
    }
  }
}, [sharedContent, clearSharedContent, handleImageUpload, handleTextSearch]);
```

## Browser Support

### Desktop
- ❌ Not supported on desktop browsers
- Web Share Target API is mobile-only

### Mobile
- ✅ Chrome/Edge (Android 12+)
- ✅ Safari (iOS 15.4+)
- ❌ Firefox (no support yet)

## Testing

### Prerequisites
1. App must be installed as PWA
2. Must be accessed over HTTPS (or localhost for development)
3. Service worker must be active

### Test YouTube URL Sharing

1. Open YouTube app on mobile
2. Find a video
3. Tap Share button
4. Select "AI Watchlist" from share sheet
5. App should open to search page
6. Search should start automatically with the YouTube URL
7. Results should display video information

### Test Image Sharing

1. Open Photos app on mobile
2. Select an image
3. Tap Share button
4. Select "AI Watchlist" from share sheet
5. App should open to search page
6. Analysis should start automatically
7. Results should display streaming options

### Test Text Sharing

1. Open Safari/Chrome on mobile
2. Navigate to IMDb movie page
3. Tap Share button
4. Select "AI Watchlist" from share sheet
5. App should open to search page
6. Search should start automatically with URL/title
7. Results should display streaming options

## Debugging

### Check Service Worker Registration

```javascript
// In browser console
navigator.serviceWorker.getRegistration().then(reg => {
  console.log('SW registered:', reg);
});
```

### Check IndexedDB Storage

```javascript
// Open IndexedDB in DevTools
// Database: SharedContent (version 2)
// Object Store: shared
// Check for stored content with type, url, text, base64 fields
```

### Check Query Parameters

When sharing, check if the URL contains (after the hash):
- `/#/search?shared=image` - for images
- `/#/search?shared=text` - for text/URLs
- `/#/search?shared=error` - for errors

### Console Logs

Service worker logs key events with `[SW]` prefix:
```
[SW] Handling POST share target
[SW] Received share: { title, text, url, hasImage }
[SW] Extracted URL from text: https://...
[SW] Shared content stored successfully: image|text|url
```

App logs with prefixes:
```
[ShareHandler] Processing share type: image|text
[ShareHandler] Retrieved content: { type, url, text }
[Index] Processing shared content: image|url|text
[Index] Processing shared URL/text: https://...
```

## Known Limitations

1. **PWA Installation Required**: App must be installed as PWA to appear in share sheet
2. **Mobile Only**: Desktop browsers don't support Web Share Target API
3. **File Size**: Large images may take longer to convert to base64
4. **Single File**: Only supports sharing one image at a time
5. **Browser Support**: Limited to Chrome/Edge on Android and Safari on iOS

## Architecture Notes

### Why HashRouter + IndexedDB?

1. **HashRouter**: Required for GitHub Pages deployment (no server-side routing)
2. **IndexedDB for all content**: Query parameters have length limits and encoding issues with long URLs
3. **Unified storage**: Simplifies handling of both images and text
4. **Fallback mechanisms**: Direct IndexedDB access if service worker isn't ready

### Key Design Decisions

- **Store then redirect**: All shared content is stored in IndexedDB before redirecting
- **Hash-based params**: `/#/search?shared=text` instead of `/?action=shared-text#/`
- **URL extraction**: Automatically extract URLs from text field (Android compatibility)
- **Chunked base64**: Large images are converted in chunks to avoid stack overflow

## Future Enhancements

- [ ] Support multiple image sharing
- [ ] Add video sharing support
- [ ] Implement PDF sharing for movie posters
- [ ] Add share history tracking
- [ ] Offline queue for shares when network unavailable

## Related Documentation

- [Service Worker Registration](../pwa/service-worker-setup.md)
- [IndexedDB Storage](../pwa/indexeddb-usage.md)
- [Search Functionality](../features/search.md)
- [PWA Installation](../pwa/installation.md)

## Resources

- [Web Share Target API - MDN](https://developer.mozilla.org/en-US/docs/Web/Manifest/share_target)
- [Web Share Target Level 2 Spec](https://w3c.github.io/web-share-target/)
- [PWA Share Target - Chrome Developers](https://developer.chrome.com/docs/capabilities/web-apis/web-share-target)
