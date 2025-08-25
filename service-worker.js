// Service Worker for AI Watchlist PWA
const CACHE_NAME = 'ai-watchlist-v1';

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
        console.log('Opened cache');
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
            console.log('Deleting old cache:', cacheName);
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
  
  // Handle share target endpoint
  const shareTargetPath = BASE_PATH + '/share-target';
  if (request.method === 'POST' && (url.pathname === shareTargetPath || url.pathname === '/share-target')) {
    event.respondWith(handleSharedContent(request));
    return;
  }
  
  // Handle GET requests for share target (text/URL shares)
  if (request.method === 'GET' && (url.pathname === shareTargetPath || url.pathname === '/share-target')) {
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

// Handle shared images
async function handleSharedContent(request) {
  try {
    const formData = await request.formData();
    const title = formData.get('title') || '';
    const text = formData.get('text') || '';
    const url = formData.get('url') || '';
    const imageFile = formData.get('image');
    
    console.log('Received share:', { title, text, url, hasImage: !!imageFile });
    
    if (imageFile && imageFile.size > 0) {
      // Convert image to base64
      const buffer = await imageFile.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
      const mimeType = imageFile.type || 'image/jpeg';
      
      // Store in IndexedDB for retrieval by the app
      await storeSharedImage(base64, mimeType, { title, text, url });
      
      // Redirect to app with share flag
      return Response.redirect(BASE_PATH + '/?action=shared-image', 303);
    } else if (url || text) {
      // Handle text/URL share
      const params = new URLSearchParams();
      if (url) params.set('url', url);
      if (text) params.set('text', text);
      if (title) params.set('title', title);
      
      return Response.redirect(`${BASE_PATH}/?action=shared-text&${params.toString()}`, 303);
    }
    
    // No valid content to share
    return Response.redirect(BASE_PATH + '/?action=share-error', 303);
    
  } catch (error) {
    console.error('Error handling shared content:', error);
    return Response.redirect(BASE_PATH + '/?action=share-error', 303);
  }
}

// Handle shared text/URLs (GET request)
async function handleSharedText(request) {
  try {
    const url = new URL(request.url);
    const params = url.searchParams;
    
    const title = params.get('title') || '';
    const text = params.get('text') || '';
    const sharedUrl = params.get('url') || '';
    
    console.log('Received text share:', { title, text, url: sharedUrl });
    
    // Redirect to app with parameters
    const appParams = new URLSearchParams();
    if (sharedUrl) appParams.set('url', sharedUrl);
    if (text) appParams.set('text', text);
    if (title) appParams.set('title', title);
    appParams.set('action', 'shared-text');
    
    return Response.redirect(`${BASE_PATH}/?${appParams.toString()}`, 303);
    
  } catch (error) {
    console.error('Error handling shared text:', error);
    return Response.redirect(BASE_PATH + '/?action=share-error', 303);
  }
}

// Store shared image in IndexedDB
async function storeSharedImage(base64, mimeType, metadata) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('SharedContent', 1);
    
    request.onerror = () => reject(request.error);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('images')) {
        db.createObjectStore('images', { keyPath: 'id', autoIncrement: true });
      }
    };
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(['images'], 'readwrite');
      const store = transaction.objectStore('images');
      
      const data = {
        base64,
        mimeType,
        metadata,
        timestamp: Date.now()
      };
      
      const addRequest = store.add(data);
      
      addRequest.onsuccess = () => {
        console.log('Shared image stored successfully');
        resolve(addRequest.result);
      };
      
      addRequest.onerror = () => reject(addRequest.error);
    };
  });
}

// Message handler for communication with the app
self.addEventListener('message', (event) => {
  if (event.data.type === 'GET_SHARED_IMAGE') {
    getLatestSharedImage().then(image => {
      event.ports[0].postMessage({ type: 'SHARED_IMAGE', data: image });
    });
  }
  
  if (event.data.type === 'CLEAR_SHARED_IMAGES') {
    clearSharedImages().then(() => {
      event.ports[0].postMessage({ type: 'CLEARED' });
    });
  }
});

// Get the latest shared image from IndexedDB
async function getLatestSharedImage() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('SharedContent', 1);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('images')) {
        resolve(null);
        return;
      }
      
      const transaction = db.transaction(['images'], 'readonly');
      const store = transaction.objectStore('images');
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => {
        const images = getAllRequest.result;
        if (images && images.length > 0) {
          // Return the most recent image
          const latest = images.sort((a, b) => b.timestamp - a.timestamp)[0];
          resolve(latest);
        } else {
          resolve(null);
        }
      };
      
      getAllRequest.onerror = () => reject(getAllRequest.error);
    };
  });
}

// Clear all shared images from IndexedDB
async function clearSharedImages() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('SharedContent', 1);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('images')) {
        resolve();
        return;
      }
      
      const transaction = db.transaction(['images'], 'readwrite');
      const store = transaction.objectStore('images');
      const clearRequest = store.clear();
      
      clearRequest.onsuccess = () => resolve();
      clearRequest.onerror = () => reject(clearRequest.error);
    };
  });
}