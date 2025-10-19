# Web Share Target API Integration

## Overview

Visual Stream Finder supports the Web Share Target API, allowing users to share images and text from other apps directly to our PWA. When content is shared, the app automatically starts the search process to identify the content and find streaming platforms.

## How It Works

### User Flow

1. **User shares content** from another app (Photos, Safari, Chrome, etc.)
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
IndexedDB (for images) or Query Params (for text)
  ↓
useShareHandler Hook
  ↓
Navigate to /search
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
2. Converts image to base64
3. Stores in IndexedDB with metadata
4. Redirects to app with `?action=shared-image`
5. useShareHandler retrieves from IndexedDB
6. Converts back to File object
7. Calls `handleImageUpload()` in Index.tsx
8. AI Vision analysis begins automatically

### 2. Text & URLs

**Supported types:**
- Plain text (movie/TV show titles)
- URLs (IMDb links, streaming platform URLs)
- Rich text with metadata

**Process:**
1. Service worker receives POST/GET request with text data
2. Extracts title, text, and URL parameters
3. Redirects to app with `?action=shared-text&url=...&text=...`
4. useShareHandler parses query parameters
5. Calls `handleTextSearch()` in Index.tsx
6. AI-powered search begins automatically

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
- `handleSharedContent(request)` - Processes POST requests with images
- `handleSharedText(request)` - Processes GET requests with text/URLs
- `storeSharedImage()` - Saves images to IndexedDB
- `getLatestSharedImage()` - Retrieves shared images
- `clearSharedImages()` - Cleans up after processing

### Share Handler Hook

Location: [`src/hooks/useShareHandler.ts`](../../src/hooks/useShareHandler.ts)

**Responsibilities:**
- Detects share actions via query parameters
- Retrieves shared images from IndexedDB
- Parses shared text and URLs
- Provides shared content to components
- Navigates to `/search` page
- Shows toast notifications
- Cleans up URLs and storage

### Search Page Integration

Location: [`src/pages/Index.tsx`](../../src/pages/Index.tsx)

**Key integration (lines 121-146):**
```typescript
useEffect(() => {
  if (sharedContent) {
    if (sharedContent.type === 'image' && sharedContent.imageBase64) {
      // Convert base64 to File and trigger image analysis
      handleImageUpload(file);
      clearSharedContent();
    } else if (sharedContent.type === 'text' || sharedContent.type === 'url') {
      // Trigger text search
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

### Test URL Sharing

1. Copy a movie title or IMDb URL
2. Use system share sheet
3. Select "AI Watchlist"
4. App should process the URL/text

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
// Database: SharedContent
// Object Store: images
// Check for stored shared images
```

### Check Query Parameters

When sharing, check if the URL contains:
- `?action=shared-image` - for images
- `?action=shared-text&url=...&text=...` - for text/URLs
- `?action=share-error` - for errors

### Console Logs

Service worker logs key events:
```
Received share: { title, text, url, hasImage }
Shared image stored successfully
Received text share: { title, text, url }
```

## Known Limitations

1. **PWA Installation Required**: App must be installed as PWA to appear in share sheet
2. **Mobile Only**: Desktop browsers don't support Web Share Target API
3. **File Size**: Images are limited by browser IndexedDB quotas
4. **Single File**: Only supports sharing one image at a time
5. **Browser Support**: Limited to Chrome/Edge on Android and Safari on iOS

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
- [PWA Share Target - web.dev](https://web.dev/web-share-target/)
