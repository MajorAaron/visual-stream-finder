/**
 * Streaming Service Icon Mapping
 * 
 * This file contains the icon mappings for various streaming services.
 * Icons are stored locally in the /public/icons directory for reliability and performance.
 */

export interface StreamingServiceIcon {
  name: string;
  id: string;
  logo: string;
  logoType: 'svg' | 'png' | 'jpg' | 'ico';
  primaryColor?: string;
}

// Base URL for local icons - in production this will be the app's URL
const getIconUrl = (filename: string): string => {
  return `/icons/${filename}`;
};

export const streamingServiceIcons: Record<string, StreamingServiceIcon> = {
  // Netflix
  netflix: {
    name: 'Netflix',
    id: 'netflix',
    logo: getIconUrl('netflix.png'),
    logoType: 'png',
    primaryColor: '#E50914'
  },
  
  // Amazon Prime Video
  prime: {
    name: 'Amazon Prime Video',
    id: 'prime',
    logo: getIconUrl('amazonprime.png'),
    logoType: 'png',
    primaryColor: '#00A8E1'
  },
  amazon: {
    name: 'Amazon Prime Video',
    id: 'amazon',
    logo: getIconUrl('amazonprime.png'),
    logoType: 'png',
    primaryColor: '#00A8E1'
  },
  amazonprime: {
    name: 'Amazon Prime Video',
    id: 'amazonprime',
    logo: getIconUrl('amazonprime.png'),
    logoType: 'png',
    primaryColor: '#00A8E1'
  },
  amazonprimevideo: {
    name: 'Amazon Prime Video',
    id: 'amazonprimevideo',
    logo: getIconUrl('amazonprime.png'),
    logoType: 'png',
    primaryColor: '#00A8E1'
  },
  
  // Disney+ - using fallback for now
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
    logo: getIconUrl('hbomax.jpg'),
    logoType: 'jpg',
    primaryColor: '#002BE7'
  },
  hbomax: {
    name: 'Max',
    id: 'hbomax',
    logo: getIconUrl('hbomax.jpg'),
    logoType: 'jpg',
    primaryColor: '#002BE7'
  },
  max: {
    name: 'Max',
    id: 'max',
    logo: getIconUrl('hbomax.jpg'),
    logoType: 'jpg',
    primaryColor: '#002BE7'
  },
  
  // Hulu
  hulu: {
    name: 'Hulu',
    id: 'hulu',
    logo: getIconUrl('hulu.jpg'),
    logoType: 'jpg',
    primaryColor: '#1CE783'
  },
  
  // Apple TV+ - using fallback for now
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
    logo: getIconUrl('paramountplus.jpg'),
    logoType: 'jpg',
    primaryColor: '#0064FF'
  },
  paramountplus: {
    name: 'Paramount+',
    id: 'paramountplus',
    logo: getIconUrl('paramountplus.jpg'),
    logoType: 'jpg',
    primaryColor: '#0064FF'
  },
  
  // Peacock - using fallback for now
  peacock: {
    name: 'Peacock',
    id: 'peacock',
    logo: '',
    logoType: 'png',
    primaryColor: '#000000'
  },
  
  // YouTube / YouTube TV
  youtube: {
    name: 'YouTube',
    id: 'youtube',
    logo: getIconUrl('youtube.png'),
    logoType: 'png',
    primaryColor: '#FF0000'
  },
  youtubetv: {
    name: 'YouTube TV',
    id: 'youtubetv',
    logo: getIconUrl('youtube.png'),
    logoType: 'png',
    primaryColor: '#FF0000'
  },
  
  // Additional services with fallback icons
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
  
  discovery: {
    name: 'Discovery+',
    id: 'discovery',
    logo: '',
    logoType: 'png',
    primaryColor: '#2175D9'
  },
  discoveryplus: {
    name: 'Discovery+',
    id: 'discoveryplus',
    logo: '',
    logoType: 'png',
    primaryColor: '#2175D9'
  },
  
  amc: {
    name: 'AMC+',
    id: 'amc',
    logo: '',
    logoType: 'png',
    primaryColor: '#FCB711'
  },
  amcplus: {
    name: 'AMC+',
    id: 'amcplus',
    logo: '',
    logoType: 'png',
    primaryColor: '#FCB711'
  },
  
  tubi: {
    name: 'Tubi',
    id: 'tubi',
    logo: '',
    logoType: 'png',
    primaryColor: '#FA382F'
  },
  
  pluto: {
    name: 'Pluto TV',
    id: 'pluto',
    logo: '',
    logoType: 'png',
    primaryColor: '#00D7E4'
  },
  plutotv: {
    name: 'Pluto TV',
    id: 'plutotv',
    logo: '',
    logoType: 'png',
    primaryColor: '#00D7E4'
  },
  
  vudu: {
    name: 'Vudu',
    id: 'vudu',
    logo: '',
    logoType: 'png',
    primaryColor: '#3399FF'
  },
  
  fubo: {
    name: 'FuboTV',
    id: 'fubo',
    logo: '',
    logoType: 'png',
    primaryColor: '#FF6600'
  },
  fubotv: {
    name: 'FuboTV',
    id: 'fubotv',
    logo: '',
    logoType: 'png',
    primaryColor: '#FF6600'
  },
  
  googleplay: {
    name: 'Google Play',
    id: 'googleplay',
    logo: '',
    logoType: 'png',
    primaryColor: '#414141'
  },
  google: {
    name: 'Google Play',
    id: 'google',
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
  },
  
  roku: {
    name: 'Roku',
    id: 'roku',
    logo: '',
    logoType: 'png',
    primaryColor: '#662D91'
  },
  
  sling: {
    name: 'Sling TV',
    id: 'sling',
    logo: '',
    logoType: 'png',
    primaryColor: '#FF6900'
  },
  
  espn: {
    name: 'ESPN+',
    id: 'espn',
    logo: '',
    logoType: 'png',
    primaryColor: '#FF0000'
  },
  espnplus: {
    name: 'ESPN+',
    id: 'espnplus',
    logo: '',
    logoType: 'png',
    primaryColor: '#FF0000'
  },
  
  mgm: {
    name: 'MGM+',
    id: 'mgm',
    logo: '',
    logoType: 'png',
    primaryColor: '#F5C518'
  },
  mgmplus: {
    name: 'MGM+',
    id: 'mgmplus',
    logo: '',
    logoType: 'png',
    primaryColor: '#F5C518'
  }
};

/**
 * Get the icon configuration for a streaming service
 * @param serviceId - The ID of the streaming service (case-insensitive)
 * @returns The icon configuration or a default fallback
 */
export function getStreamingServiceIcon(serviceId: string): StreamingServiceIcon {
  const normalizedId = serviceId.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  return streamingServiceIcons[normalizedId] || {
    name: serviceId.charAt(0).toUpperCase() + serviceId.slice(1),
    id: serviceId,
    logo: '', // No logo available - will use fallback
    logoType: 'png',
    primaryColor: '#666666'
  };
}

/**
 * Get all available streaming service icons
 * @returns Array of all streaming service icon configurations
 */
export function getAllStreamingServiceIcons(): StreamingServiceIcon[] {
  const uniqueServices = new Map<string, StreamingServiceIcon>();
  
  Object.values(streamingServiceIcons).forEach(service => {
    if (!uniqueServices.has(service.name)) {
      uniqueServices.set(service.name, service);
    }
  });
  
  return Array.from(uniqueServices.values());
}