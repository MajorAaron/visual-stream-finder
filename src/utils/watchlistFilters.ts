import { WatchlistItem } from './watchlistService';

/**
 * Extracts all unique streaming source names from watchlist items
 */
export function extractUniqueStreamingSources(items: WatchlistItem[]): string[] {
  const sourceSet = new Set<string>();
  
  items.forEach(item => {
    // Extract sources from streaming_sources array
    if (item.streaming_sources && Array.isArray(item.streaming_sources)) {
      item.streaming_sources.forEach((source: any) => {
        if (source && source.name && typeof source.name === 'string') {
          sourceSet.add(source.name);
        }
      });
    }
    
    // Add YouTube as a source if this is a YouTube item
    if (item.type === 'youtube' || item.youtube_url) {
      sourceSet.add('YouTube');
    }
  });
  
  return Array.from(sourceSet).sort();
}

/**
 * Filters watchlist items by streaming source name
 */
export function filterByStreamingSource(
  items: WatchlistItem[],
  sourceName: string | null
): WatchlistItem[] {
  if (!sourceName || sourceName === 'all') {
    return items;
  }
  
  return items.filter(item => {
    // Handle YouTube filtering
    if (sourceName === 'YouTube') {
      return item.type === 'youtube' || !!item.youtube_url;
    }
    
    // Handle other streaming sources
    if (!item.streaming_sources || !Array.isArray(item.streaming_sources)) {
      return false;
    }
    
    return item.streaming_sources.some((source: any) => 
      source && source.name === sourceName
    );
  });
}
