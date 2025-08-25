import React, { useState } from 'react';
import { getStreamingServiceIcon } from '@/config/streamingIcons';

interface StreamingIconProps {
  serviceId: string;
  serviceName?: string;
  className?: string;
  fallbackUrl?: string;
}

export const StreamingIcon: React.FC<StreamingIconProps> = ({ 
  serviceId, 
  serviceName,
  className = "w-8 h-8",
  fallbackUrl
}) => {
  const [error, setError] = useState(false);
  
  // Normalize the service name for lookup
  const normalizedServiceId = serviceName ? 
    serviceName.toLowerCase().replace(/[^a-z0-9]/g, '') : 
    serviceId.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  const icon = getStreamingServiceIcon(normalizedServiceId);
  
  // Use the icon from our mapping, or fallback to provided URL
  const logoUrl = !error && icon.logo ? icon.logo : (fallbackUrl || '');
  const displayName = icon.name || serviceName || serviceId;
  
  // Services that need white background for visibility
  const needsWhiteBg = [
    'amazon', 'prime', 'amazonprime', 'amazonprimevideo',
    'apple', 'appletv', 'appletvplus'
  ].includes(normalizedServiceId);
  
  if (!logoUrl || error) {
    // Fallback to text-based icon with the service's primary color and white bg if needed
    return (
      <div className={`${className} rounded-md flex items-center justify-center font-bold ${
        needsWhiteBg ? 'bg-white text-black' : 'text-white'
      } text-xs`}
           style={{ backgroundColor: needsWhiteBg ? '#ffffff' : (icon.primaryColor || '#666666') }}>
        {displayName.substring(0, 2).toUpperCase()}
      </div>
    );
  }
  
  // For all images - local icons don't need crossOrigin
  return (
    <div className={`${className} flex items-center justify-center rounded-md overflow-hidden ${
      needsWhiteBg ? 'bg-white' : 'bg-white/5'
    }`}>
      <img
        src={logoUrl}
        alt={displayName}
        className={`w-full h-full object-contain ${needsWhiteBg ? 'p-1' : ''}`}
        onError={() => setError(true)}
      />
    </div>
  );
};