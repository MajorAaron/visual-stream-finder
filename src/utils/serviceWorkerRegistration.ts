// Service Worker Registration and Management

export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      // Use base path for GitHub Pages deployment
      const basePath = import.meta.env.BASE_URL || '/';
      const swPath = `${basePath}service-worker.js`;
      
      const registration = await navigator.serviceWorker.register(swPath);
      console.log('Service Worker registered successfully:', registration);
      
      // Check for updates periodically
      setInterval(() => {
        registration.update();
      }, 60000); // Check every minute
      
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  }
  return null;
};

export const unregisterServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
    }
  }
};

// Get shared image from service worker
export const getSharedImage = async (): Promise<{
  base64: string;
  mimeType: string;
  metadata: { title: string; text: string; url: string };
} | null> => {
  if (!('serviceWorker' in navigator)) return null;
  
  return new Promise((resolve) => {
    const messageChannel = new MessageChannel();
    
    messageChannel.port1.onmessage = (event) => {
      if (event.data.type === 'SHARED_IMAGE' && event.data.data) {
        resolve(event.data.data);
      } else {
        resolve(null);
      }
    };
    
    navigator.serviceWorker.controller?.postMessage(
      { type: 'GET_SHARED_IMAGE' },
      [messageChannel.port2]
    );
    
    // Timeout after 2 seconds
    setTimeout(() => resolve(null), 2000);
  });
};

// Clear shared images from IndexedDB
export const clearSharedImages = async (): Promise<void> => {
  if (!('serviceWorker' in navigator)) return;
  
  return new Promise((resolve) => {
    const messageChannel = new MessageChannel();
    
    messageChannel.port1.onmessage = () => {
      resolve();
    };
    
    navigator.serviceWorker.controller?.postMessage(
      { type: 'CLEAR_SHARED_IMAGES' },
      [messageChannel.port2]
    );
    
    // Timeout after 1 second
    setTimeout(() => resolve(), 1000);
  });
};