import { writeFileSync } from 'fs';
import { join } from 'path';

// Simple SVG icon template
const createIcon = (size) => {
  const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#8b5cf6;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#6d28d9;stop-opacity:1" />
      </linearGradient>
    </defs>
    <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="url(#grad)"/>
    <text x="50%" y="45%" text-anchor="middle" fill="white" font-size="${size * 0.35}" font-weight="bold" font-family="system-ui">AI</text>
    <text x="50%" y="65%" text-anchor="middle" fill="white" font-size="${size * 0.12}" font-family="system-ui">WATCHLIST</text>
  </svg>`;
  
  return Buffer.from(svg).toString('base64');
};

// Generate base64 icons for embedding
console.log('Icon 192:', `data:image/svg+xml;base64,${createIcon(192)}`);
console.log('Icon 512:', `data:image/svg+xml;base64,${createIcon(512)}`);
console.log('Icon 96:', `data:image/svg+xml;base64,${createIcon(96)}`);