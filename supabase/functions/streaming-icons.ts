/**
 * Streaming Service Icon Mapping for Edge Functions
 * Uses Simple Icons CDN for reliable, free brand logos with local fallbacks
 */

export interface StreamingServiceIcon {
  name: string;
  id: string;
  logo: string;
  logoType: 'svg' | 'png' | 'jpg' | 'ico';
  primaryColor?: string;
}

// Simple Icons CDN - Free, reliable, 3000+ brand logos
// Format: https://cdn.simpleicons.org/[brandname]/[hexcolor]
const getSimpleIconUrl = (brandName: string, color?: string): string => {
  const baseUrl = `https://cdn.simpleicons.org/${brandName}`;
  return color ? `${baseUrl}/${color.replace('#', '')}` : baseUrl;
};

// Fallback to local icons for services we have hosted
const getPublicIconUrl = (filename: string): string => {
  if (!filename) return '';
  return `/icons/${filename}`;
};

// Multi-layer logo resolution: Simple Icons CDN → Local → Favicon
const getLogo = (simpleIconName: string, localFile?: string, fallbackDomain?: string): string => {
  // Primary: Simple Icons CDN (most reliable)
  if (simpleIconName) {
    return getSimpleIconUrl(simpleIconName);
  }
  // Secondary: Local file
  if (localFile) {
    return getPublicIconUrl(localFile);
  }
  // Tertiary: Service favicon
  if (fallbackDomain) {
    return `https://www.${fallbackDomain}/favicon.ico`;
  }
  return '';
};

export const streamingServiceIcons: Record<string, StreamingServiceIcon> = {
  // Netflix
  netflix: {
    name: 'Netflix',
    id: 'netflix',
    logo: getLogo('netflix', 'netflix.png', 'netflix.com'),
    logoType: 'svg',
    primaryColor: '#E50914'
  },

  // Amazon Prime Video
  prime: {
    name: 'Prime Video',
    id: 'prime',
    logo: getLogo('amazonprimevideo', 'amazonprime.png', 'primevideo.com'),
    logoType: 'svg',
    primaryColor: '#00A8E1'
  },
  amazon: {
    name: 'Prime Video',
    id: 'amazon',
    logo: getLogo('amazonprimevideo', 'amazonprime.png', 'primevideo.com'),
    logoType: 'svg',
    primaryColor: '#00A8E1'
  },
  amazonprime: {
    name: 'Prime Video',
    id: 'amazonprime',
    logo: getLogo('amazonprimevideo', 'amazonprime.png', 'primevideo.com'),
    logoType: 'svg',
    primaryColor: '#00A8E1'
  },

  // Disney+
  disney: {
    name: 'Disney+',
    id: 'disney',
    logo: getLogo('disneyplus', '', 'disneyplus.com'),
    logoType: 'svg',
    primaryColor: '#113CCF'
  },
  disneyplus: {
    name: 'Disney+',
    id: 'disneyplus',
    logo: getLogo('disneyplus', '', 'disneyplus.com'),
    logoType: 'svg',
    primaryColor: '#113CCF'
  },

  // HBO Max / Max
  hbo: {
    name: 'Max',
    id: 'hbo',
    logo: getLogo('hbo', 'hbomax.jpg', 'max.com'),
    logoType: 'svg',
    primaryColor: '#002BE7'
  },
  hbomax: {
    name: 'Max',
    id: 'hbomax',
    logo: getLogo('hbomax', 'hbomax.jpg', 'max.com'),
    logoType: 'svg',
    primaryColor: '#002BE7'
  },
  max: {
    name: 'Max',
    id: 'max',
    logo: getLogo('max', 'hbomax.jpg', 'max.com'),
    logoType: 'svg',
    primaryColor: '#002BE7'
  },

  // Hulu
  hulu: {
    name: 'Hulu',
    id: 'hulu',
    logo: getLogo('hulu', 'hulu.jpg', 'hulu.com'),
    logoType: 'svg',
    primaryColor: '#1CE783'
  },

  // Apple TV+
  apple: {
    name: 'Apple TV+',
    id: 'apple',
    logo: getLogo('appletvplus', '', 'tv.apple.com'),
    logoType: 'svg',
    primaryColor: '#000000'
  },
  appletv: {
    name: 'Apple TV+',
    id: 'appletv',
    logo: getLogo('appletvplus', '', 'tv.apple.com'),
    logoType: 'svg',
    primaryColor: '#000000'
  },
  appletvplus: {
    name: 'Apple TV+',
    id: 'appletvplus',
    logo: getLogo('appletvplus', '', 'tv.apple.com'),
    logoType: 'svg',
    primaryColor: '#000000'
  },

  // Paramount+
  paramount: {
    name: 'Paramount+',
    id: 'paramount',
    logo: getLogo('paramountplus', 'paramountplus.jpg', 'paramountplus.com'),
    logoType: 'svg',
    primaryColor: '#0064FF'
  },
  paramountplus: {
    name: 'Paramount+',
    id: 'paramountplus',
    logo: getLogo('paramountplus', 'paramountplus.jpg', 'paramountplus.com'),
    logoType: 'svg',
    primaryColor: '#0064FF'
  },

  // Peacock
  peacock: {
    name: 'Peacock',
    id: 'peacock',
    logo: getLogo('peacock', '', 'peacocktv.com'),
    logoType: 'svg',
    primaryColor: '#000000'
  },

  // YouTube
  youtube: {
    name: 'YouTube',
    id: 'youtube',
    logo: getLogo('youtube', 'youtube.png', 'youtube.com'),
    logoType: 'svg',
    primaryColor: '#FF0000'
  },
  youtubetv: {
    name: 'YouTube TV',
    id: 'youtubetv',
    logo: getLogo('youtube', 'youtube.png', 'youtube.com'),
    logoType: 'svg',
    primaryColor: '#FF0000'
  },

  // Aggregator Services (NEW)
  justwatch: {
    name: 'JustWatch',
    id: 'justwatch',
    logo: getLogo('justwatch', '', 'justwatch.com'),
    logoType: 'svg',
    primaryColor: '#000000'
  },

  reelgood: {
    name: 'Reelgood',
    id: 'reelgood',
    logo: 'https://www.reelgood.com/favicon.ico', // Not in Simple Icons
    logoType: 'ico',
    primaryColor: '#000000'
  },

  google: {
    name: 'Google Search',
    id: 'google',
    logo: getLogo('google', '', 'google.com'),
    logoType: 'svg',
    primaryColor: '#4285F4'
  },

  // Additional services
  showtime: {
    name: 'Showtime',
    id: 'showtime',
    logo: getLogo('showtime', '', 'showtime.com'),
    logoType: 'svg',
    primaryColor: '#FF0000'
  },

  starz: {
    name: 'Starz',
    id: 'starz',
    logo: getLogo('starz', '', 'starz.com'),
    logoType: 'svg',
    primaryColor: '#000000'
  },

  crunchyroll: {
    name: 'Crunchyroll',
    id: 'crunchyroll',
    logo: getLogo('crunchyroll', '', 'crunchyroll.com'),
    logoType: 'svg',
    primaryColor: '#F47521'
  },

  tubi: {
    name: 'Tubi',
    id: 'tubi',
    logo: getLogo('tubi', '', 'tubi.tv'),
    logoType: 'svg',
    primaryColor: '#FA382F'
  },

  vudu: {
    name: 'Vudu',
    id: 'vudu',
    logo: getLogo('vudu', '', 'vudu.com'),
    logoType: 'svg',
    primaryColor: '#3399FF'
  },

  googleplay: {
    name: 'Google Play',
    id: 'googleplay',
    logo: getLogo('googleplay', '', 'play.google.com'),
    logoType: 'svg',
    primaryColor: '#414141'
  },

  microsoft: {
    name: 'Microsoft Store',
    id: 'microsoft',
    logo: getLogo('microsoft', '', 'microsoft.com'),
    logoType: 'svg',
    primaryColor: '#0078D4'
  },

  itunes: {
    name: 'iTunes',
    id: 'itunes',
    logo: getLogo('itunes', '', 'apple.com'),
    logoType: 'svg',
    primaryColor: '#000000'
  }
};

export function getStreamingServiceIcon(serviceId: string): StreamingServiceIcon {
  const normalizedId = serviceId.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  return streamingServiceIcons[normalizedId] || {
    name: serviceId.charAt(0).toUpperCase() + serviceId.slice(1),
    id: serviceId,
    logo: '',
    logoType: 'png',
    primaryColor: '#666666'
  };
}