// Service Worker Registration and Management

export interface SharedContent {
  type: 'image' | 'text' | 'url';
  base64?: string;
  mimeType?: string;
  url?: string;
  text?: string;
  title?: string;
  timestamp: number;
}

export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!('serviceWorker' in navigator)) {
    console.log('[SW Registration] Service workers not supported');
    return null;
  }

  try {
    // Use base path for GitHub Pages deployment
    const basePath = import.meta.env.BASE_URL || '/';
    const swPath = `${basePath}service-worker.js`;

    const registration = await navigator.serviceWorker.register(swPath);
    console.log('[SW Registration] Service Worker registered successfully:', registration.scope);

    // Check for updates periodically
    setInterval(() => {
      registration.update();
    }, 60000); // Check every minute

    return registration;
  } catch (error) {
    console.error('[SW Registration] Service Worker registration failed:', error);
    return null;
  }
};

export const unregisterServiceWorker = async (): Promise<void> => {
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
    }
  }
};

// Wait for service worker to be ready and controlling the page
const waitForServiceWorker = async (timeoutMs = 5000): Promise<ServiceWorker | null> => {
  if (!('serviceWorker' in navigator)) return null;

  // If already controlled, return the controller
  if (navigator.serviceWorker.controller) {
    return navigator.serviceWorker.controller;
  }

  // Wait for the service worker to take control
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      console.log('[SW] Timeout waiting for controller');
      resolve(null);
    }, timeoutMs);

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      clearTimeout(timeout);
      console.log('[SW] Controller changed, now available');
      resolve(navigator.serviceWorker.controller);
    }, { once: true });

    // Also try waiting for ready state
    navigator.serviceWorker.ready.then((registration) => {
      if (registration.active) {
        clearTimeout(timeout);
        // The active worker might not be the controller yet, but we can still communicate
        resolve(registration.active);
      }
    });
  });
};

// Get shared content from service worker (unified for images and text)
export const getSharedContent = async (): Promise<SharedContent | null> => {
  if (!('serviceWorker' in navigator)) {
    console.log('[SW] Service workers not supported');
    return null;
  }

  // Wait for service worker to be available
  const sw = await waitForServiceWorker();
  if (!sw) {
    console.log('[SW] No service worker available, trying direct IndexedDB access');
    // Fallback: Try to access IndexedDB directly
    return getSharedContentFromIndexedDB();
  }

  return new Promise((resolve) => {
    const messageChannel = new MessageChannel();

    messageChannel.port1.onmessage = (event) => {
      console.log('[SW] Received response:', event.data);
      if (event.data.type === 'SHARED_CONTENT' && event.data.data) {
        resolve(event.data.data as SharedContent);
      } else {
        resolve(null);
      }
    };

    console.log('[SW] Requesting shared content');
    sw.postMessage({ type: 'GET_SHARED_CONTENT' }, [messageChannel.port2]);

    // Timeout after 3 seconds
    setTimeout(() => {
      console.log('[SW] Request timeout, trying direct IndexedDB');
      getSharedContentFromIndexedDB().then(resolve);
    }, 3000);
  });
};

// Direct IndexedDB access (fallback when service worker isn't ready)
const getSharedContentFromIndexedDB = async (): Promise<SharedContent | null> => {
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open('SharedContent', 2);

      request.onerror = () => {
        console.error('[IndexedDB] Open error');
        resolve(null);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('shared')) {
          db.createObjectStore('shared', { keyPath: 'id', autoIncrement: true });
        }
      };

      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains('shared')) {
          resolve(null);
          return;
        }

        const transaction = db.transaction(['shared'], 'readonly');
        const store = transaction.objectStore('shared');
        const getAllRequest = store.getAll();

        getAllRequest.onsuccess = () => {
          const items = getAllRequest.result as SharedContent[];
          if (items && items.length > 0) {
            const latest = items.sort((a, b) => b.timestamp - a.timestamp)[0];
            console.log('[IndexedDB] Found shared content:', latest.type);
            resolve(latest);
          } else {
            resolve(null);
          }
        };

        getAllRequest.onerror = () => {
          console.error('[IndexedDB] Get error');
          resolve(null);
        };
      };
    } catch (err) {
      console.error('[IndexedDB] Error:', err);
      resolve(null);
    }
  });
};

// Clear shared content from IndexedDB
export const clearSharedContent = async (): Promise<void> => {
  // Try via service worker first
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();

      messageChannel.port1.onmessage = () => {
        console.log('[SW] Shared content cleared via SW');
        resolve();
      };

      navigator.serviceWorker.controller.postMessage(
        { type: 'CLEAR_SHARED_CONTENT' },
        [messageChannel.port2]
      );

      // Timeout and resolve anyway
      setTimeout(() => {
        clearSharedContentFromIndexedDB().then(resolve);
      }, 1000);
    });
  }

  // Fallback: clear directly from IndexedDB
  return clearSharedContentFromIndexedDB();
};

// Direct IndexedDB clear (fallback)
const clearSharedContentFromIndexedDB = async (): Promise<void> => {
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open('SharedContent', 2);

      request.onerror = () => resolve();

      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains('shared')) {
          resolve();
          return;
        }

        const transaction = db.transaction(['shared'], 'readwrite');
        const store = transaction.objectStore('shared');
        const clearRequest = store.clear();

        clearRequest.onsuccess = () => {
          console.log('[IndexedDB] Shared content cleared');
          resolve();
        };
        clearRequest.onerror = () => resolve();
      };
    } catch (err) {
      console.error('[IndexedDB] Clear error:', err);
      resolve();
    }
  });
};

// Legacy exports for backward compatibility
export const getSharedImage = async (): Promise<{
  base64: string;
  mimeType: string;
  metadata: { title: string; text: string; url: string };
} | null> => {
  const content = await getSharedContent();
  if (content && content.type === 'image' && content.base64) {
    return {
      base64: content.base64,
      mimeType: content.mimeType || 'image/jpeg',
      metadata: {
        title: content.title || '',
        text: content.text || '',
        url: content.url || ''
      }
    };
  }
  return null;
};

export const clearSharedImages = clearSharedContent;
