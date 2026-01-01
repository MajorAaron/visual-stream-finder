// Service Worker for AI Watchlist PWA
// Version 2.0 - Fixed for HashRouter compatibility
const CACHE_NAME = 'ai-watchlist-v2';

// Get the base path for GitHub Pages deployment
const BASE_PATH = self.location.pathname.replace('/service-worker.js', '');

const urlsToCache = [
  BASE_PATH + '/',
  BASE_PATH + '/index.html',
  BASE_PATH + '/manifest.json',
  BASE_PATH + '/icon-192.png',
  BASE_PATH + '/icon-512.png'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
  // Skip waiting to activate immediately
  self.skipWaiting();
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Take control of all clients immediately
  self.clients.claim();
});

// Fetch event - handle shared content and cache strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle share target endpoint - check various path patterns
  const shareTargetPath = BASE_PATH + '/share-target';
  const isShareTarget = url.pathname === shareTargetPath ||
                        url.pathname === '/share-target' ||
                        url.pathname.endsWith('/share-target');

  if (request.method === 'POST' && isShareTarget) {
    console.log('[SW] Handling POST share target');
    event.respondWith(handleSharedContent(request));
    return;
  }

  // Handle GET requests for share target (text/URL shares from some apps)
  if (request.method === 'GET' && isShareTarget) {
    console.log('[SW] Handling GET share target');
    event.respondWith(handleSharedText(request));
    return;
  }

  // Network first, fallback to cache strategy for other requests
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Don't cache non-successful responses
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // Clone the response for caching
        const responseToCache = response.clone();

        caches.open(CACHE_NAME)
          .then((cache) => {
            cache.put(request, responseToCache);
          });

        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(request);
      })
  );
});

// URL detection regex for extracting URLs from text
const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;

// Detect if a string contains a URL
function extractUrl(text) {
  if (!text) return null;
  const matches = text.match(URL_REGEX);
  return matches ? matches[0] : null;
}

// Handle shared content (POST - images and text/URLs)
async function handleSharedContent(request) {
  try {
    const formData = await request.formData();
    const title = formData.get('title') || '';
    const text = formData.get('text') || '';
    let url = formData.get('url') || '';
    const imageFile = formData.get('image');

    console.log('[SW] Received share:', { title, text, url, hasImage: !!imageFile });

    // On Android, URLs often come through the 'text' field instead of 'url'
    // Extract URL from text if url field is empty
    if (!url && text) {
      const extractedUrl = extractUrl(text.toString());
      if (extractedUrl) {
        console.log('[SW] Extracted URL from text:', extractedUrl);
        url = extractedUrl;
      }
    }

    if (imageFile && imageFile.size > 0) {
      // Convert image to base64
      const buffer = await imageFile.arrayBuffer();
      const base64 = arrayBufferToBase64(buffer);
      const mimeType = imageFile.type || 'image/jpeg';

      // Store in IndexedDB for retrieval by the app
      await storeSharedContent({
        type: 'image',
        base64,
        mimeType,
        title: title.toString(),
        text: text.toString(),
        url: url.toString(),
        timestamp: Date.now()
      });

      // Redirect to app with hash-based routing
      // IMPORTANT: Use hash routing for compatibility with React HashRouter
      return Response.redirect(BASE_PATH + '/#/search?shared=image', 303);
    } else if (url || text) {
      // Store text/URL in IndexedDB (more reliable than query params)
      await storeSharedContent({
        type: url ? 'url' : 'text',
        url: url.toString(),
        text: text.toString(),
        title: title.toString(),
        timestamp: Date.now()
      });

      return Response.redirect(BASE_PATH + '/#/search?shared=text', 303);
    }

    // No valid content to share
    console.log('[SW] No valid content in share');
    return Response.redirect(BASE_PATH + '/#/search?shared=error', 303);

  } catch (error) {
    console.error('[SW] Error handling shared content:', error);
    return Response.redirect(BASE_PATH + '/#/search?shared=error', 303);
  }
}

// Handle shared text/URLs (GET request - fallback for some apps)
async function handleSharedText(request) {
  try {
    const requestUrl = new URL(request.url);
    const params = requestUrl.searchParams;

    const title = params.get('title') || '';
    const text = params.get('text') || '';
    let sharedUrl = params.get('url') || '';

    console.log('[SW] Received GET text share:', { title, text, url: sharedUrl });

    // On Android, URLs often come through the 'text' field
    if (!sharedUrl && text) {
      const extractedUrl = extractUrl(text);
      if (extractedUrl) {
        console.log('[SW] Extracted URL from text in GET:', extractedUrl);
        sharedUrl = extractedUrl;
      }
    }

    if (sharedUrl || text) {
      // Store in IndexedDB for reliable retrieval
      await storeSharedContent({
        type: sharedUrl ? 'url' : 'text',
        url: sharedUrl,
        text: text,
        title: title,
        timestamp: Date.now()
      });

      return Response.redirect(BASE_PATH + '/#/search?shared=text', 303);
    }

    return Response.redirect(BASE_PATH + '/#/search?shared=error', 303);

  } catch (error) {
    console.error('[SW] Error handling shared text:', error);
    return Response.redirect(BASE_PATH + '/#/search?shared=error', 303);
  }
}

// Convert ArrayBuffer to base64 (handles large files better than String.fromCharCode)
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode.apply(null, chunk);
  }
  return btoa(binary);
}

// Store shared content in IndexedDB (unified for both images and text)
async function storeSharedContent(data) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('SharedContent', 2);

    request.onerror = () => {
      console.error('[SW] IndexedDB open error:', request.error);
      reject(request.error);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      // Create unified store for all shared content
      if (!db.objectStoreNames.contains('shared')) {
        db.createObjectStore('shared', { keyPath: 'id', autoIncrement: true });
      }
      // Keep old store for backwards compatibility but don't use it
      if (!db.objectStoreNames.contains('images')) {
        db.createObjectStore('images', { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(['shared'], 'readwrite');
      const store = transaction.objectStore('shared');

      const addRequest = store.add(data);

      addRequest.onsuccess = () => {
        console.log('[SW] Shared content stored successfully:', data.type);
        resolve(addRequest.result);
      };

      addRequest.onerror = () => {
        console.error('[SW] Error storing shared content:', addRequest.error);
        reject(addRequest.error);
      };
    };
  });
}

// Message handler for communication with the app
self.addEventListener('message', (event) => {
  console.log('[SW] Received message:', event.data.type);

  if (event.data.type === 'GET_SHARED_CONTENT') {
    getLatestSharedContent().then(content => {
      console.log('[SW] Sending shared content:', content ? content.type : 'none');
      event.ports[0].postMessage({ type: 'SHARED_CONTENT', data: content });
    }).catch(err => {
      console.error('[SW] Error getting shared content:', err);
      event.ports[0].postMessage({ type: 'SHARED_CONTENT', data: null });
    });
  }

  if (event.data.type === 'CLEAR_SHARED_CONTENT') {
    clearSharedContent().then(() => {
      console.log('[SW] Shared content cleared');
      event.ports[0].postMessage({ type: 'CLEARED' });
    }).catch(err => {
      console.error('[SW] Error clearing shared content:', err);
      event.ports[0].postMessage({ type: 'CLEARED' });
    });
  }

  // Legacy support for old message types
  if (event.data.type === 'GET_SHARED_IMAGE') {
    getLatestSharedContent().then(content => {
      if (content && content.type === 'image') {
        event.ports[0].postMessage({
          type: 'SHARED_IMAGE',
          data: {
            base64: content.base64,
            mimeType: content.mimeType,
            metadata: { title: content.title, text: content.text, url: content.url }
          }
        });
      } else {
        event.ports[0].postMessage({ type: 'SHARED_IMAGE', data: null });
      }
    });
  }

  if (event.data.type === 'CLEAR_SHARED_IMAGES') {
    clearSharedContent().then(() => {
      event.ports[0].postMessage({ type: 'CLEARED' });
    });
  }
});

// Get the latest shared content from IndexedDB
async function getLatestSharedContent() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('SharedContent', 2);

    request.onerror = () => {
      console.error('[SW] IndexedDB open error:', request.error);
      reject(request.error);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('shared')) {
        db.createObjectStore('shared', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('images')) {
        db.createObjectStore('images', { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains('shared')) {
        resolve(null);
        return;
      }

      const transaction = db.transaction(['shared'], 'readonly');
      const store = transaction.objectStore('shared');
      const getAllRequest = store.getAll();

      getAllRequest.onsuccess = () => {
        const items = getAllRequest.result;
        if (items && items.length > 0) {
          // Return the most recent content
          const latest = items.sort((a, b) => b.timestamp - a.timestamp)[0];
          resolve(latest);
        } else {
          resolve(null);
        }
      };

      getAllRequest.onerror = () => {
        console.error('[SW] Error getting shared content:', getAllRequest.error);
        reject(getAllRequest.error);
      };
    };
  });
}

// Clear all shared content from IndexedDB
async function clearSharedContent() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('SharedContent', 2);

    request.onerror = () => reject(request.error);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('shared')) {
        db.createObjectStore('shared', { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains('shared')) {
        resolve();
        return;
      }

      const transaction = db.transaction(['shared'], 'readwrite');
      const store = transaction.objectStore('shared');
      const clearRequest = store.clear();

      clearRequest.onsuccess = () => resolve();
      clearRequest.onerror = () => reject(clearRequest.error);
    };
  });
}