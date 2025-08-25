/**
 * Streaming Service Icon Mapping for Edge Functions
 * This provides absolute URLs for the streaming service icons
 */

export interface StreamingServiceIcon {
  name: string;
  id: string;
  logo: string;
  logoType: 'svg' | 'png' | 'jpg' | 'ico';
  primaryColor?: string;
}

// Production URL - this should match your deployed app URL
const APP_URL = 'https://mrkcgfsbdcukufgwvjap.supabase.co';

// Helper to get full icon URL
const getIconUrl = (filename: string): string => {
  if (!filename) return '';
  // Return the full URL that will be accessible from the client
  return `${APP_URL}/storage/v1/object/public/icons/${filename}`;
};

// For now, we'll use a simpler approach - return relative URLs that the frontend will handle
// The frontend will serve these from /public/icons/
const getPublicIconUrl = (filename: string): string => {
  if (!filename) return '';
  return `/icons/${filename}`;
};

export const streamingServiceIcons: Record<string, StreamingServiceIcon> = {
  // Netflix
  netflix: {
    name: 'Netflix',
    id: 'netflix',
    logo: getPublicIconUrl('netflix.png'),
    logoType: 'png',
    primaryColor: '#E50914'
  },
  
  // Amazon Prime Video
  prime: {
    name: 'Amazon Prime Video',
    id: 'prime',
    logo: getPublicIconUrl('amazonprime.png'),
    logoType: 'png',
    primaryColor: '#00A8E1'
  },
  amazon: {
    name: 'Amazon Prime Video',
    id: 'amazon',
    logo: getPublicIconUrl('amazonprime.png'),
    logoType: 'png',
    primaryColor: '#00A8E1'
  },
  amazonprime: {
    name: 'Amazon Prime Video',
    id: 'amazonprime',
    logo: getPublicIconUrl('amazonprime.png'),
    logoType: 'png',
    primaryColor: '#00A8E1'
  },
  
  // Disney+
  disney: {
    name: 'Disney+',
    id: 'disney',
    logo: '',
    logoType: 'png',
    primaryColor: '#113CCF'
  },
  disneyplus: {
    name: 'Disney+',
    id: 'disneyplus',
    logo: '',
    logoType: 'png',
    primaryColor: '#113CCF'
  },
  
  // HBO Max / Max
  hbo: {
    name: 'Max',
    id: 'hbo',
    logo: getPublicIconUrl('hbomax.jpg'),
    logoType: 'jpg',
    primaryColor: '#002BE7'
  },
  hbomax: {
    name: 'Max',
    id: 'hbomax',
    logo: getPublicIconUrl('hbomax.jpg'),
    logoType: 'jpg',
    primaryColor: '#002BE7'
  },
  max: {
    name: 'Max',
    id: 'max',
    logo: getPublicIconUrl('hbomax.jpg'),
    logoType: 'jpg',
    primaryColor: '#002BE7'
  },
  
  // Hulu
  hulu: {
    name: 'Hulu',
    id: 'hulu',
    logo: getPublicIconUrl('hulu.jpg'),
    logoType: 'jpg',
    primaryColor: '#1CE783'
  },
  
  // Apple TV+
  apple: {
    name: 'Apple TV+',
    id: 'apple',
    logo: '',
    logoType: 'png',
    primaryColor: '#000000'
  },
  appletv: {
    name: 'Apple TV+',
    id: 'appletv',
    logo: '',
    logoType: 'png',
    primaryColor: '#000000'
  },
  appletvplus: {
    name: 'Apple TV+',
    id: 'appletvplus',
    logo: '',
    logoType: 'png',
    primaryColor: '#000000'
  },
  
  // Paramount+
  paramount: {
    name: 'Paramount+',
    id: 'paramount',
    logo: getPublicIconUrl('paramountplus.jpg'),
    logoType: 'jpg',
    primaryColor: '#0064FF'
  },
  paramountplus: {
    name: 'Paramount+',
    id: 'paramountplus',
    logo: getPublicIconUrl('paramountplus.jpg'),
    logoType: 'jpg',
    primaryColor: '#0064FF'
  },
  
  // Peacock
  peacock: {
    name: 'Peacock',
    id: 'peacock',
    logo: '',
    logoType: 'png',
    primaryColor: '#000000'
  },
  
  // YouTube
  youtube: {
    name: 'YouTube',
    id: 'youtube',
    logo: getPublicIconUrl('youtube.png'),
    logoType: 'png',
    primaryColor: '#FF0000'
  },
  youtubetv: {
    name: 'YouTube TV',
    id: 'youtubetv',
    logo: getPublicIconUrl('youtube.png'),
    logoType: 'png',
    primaryColor: '#FF0000'
  },
  
  // Additional services
  showtime: {
    name: 'Showtime',
    id: 'showtime',
    logo: '',
    logoType: 'png',
    primaryColor: '#FF0000'
  },
  
  starz: {
    name: 'Starz',
    id: 'starz',
    logo: '',
    logoType: 'png',
    primaryColor: '#000000'
  },
  
  crunchyroll: {
    name: 'Crunchyroll',
    id: 'crunchyroll',
    logo: '',
    logoType: 'png',
    primaryColor: '#F47521'
  },
  
  tubi: {
    name: 'Tubi',
    id: 'tubi',
    logo: '',
    logoType: 'png',
    primaryColor: '#FA382F'
  },
  
  vudu: {
    name: 'Vudu',
    id: 'vudu',
    logo: '',
    logoType: 'png',
    primaryColor: '#3399FF'
  },
  
  googleplay: {
    name: 'Google Play',
    id: 'googleplay',
    logo: '',
    logoType: 'png',
    primaryColor: '#414141'
  },
  
  microsoft: {
    name: 'Microsoft Store',
    id: 'microsoft',
    logo: '',
    logoType: 'png',
    primaryColor: '#0078D4'
  },
  
  itunes: {
    name: 'iTunes',
    id: 'itunes',
    logo: '',
    logoType: 'png',
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