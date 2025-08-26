import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Star, Clock, Calendar, Bookmark, BookmarkCheck } from 'lucide-react';
import { WatchlistService } from '@/utils/watchlistService';
import { DetectedContent } from '@/utils/aiAnalysis';
import { StreamingIcon } from '@/components/StreamingIcon';

interface StreamingSource {
  name: string;
  logo: string;
  url: string;
  type: 'subscription' | 'rent' | 'buy' | 'free';
  price?: string;
}

interface ResultsDisplayProps {
  results: DetectedContent[];
  onNewSearch: () => void;
}

const typeColors = {
  movie: 'bg-blue-500/20 text-blue-400',
  tv: 'bg-green-500/20 text-green-400',
  documentary: 'bg-purple-500/20 text-purple-400',
  youtube: 'bg-red-500/20 text-red-400'
};




export const ResultsDisplay = ({ results, onNewSearch }: ResultsDisplayProps) => {
  const [savedItems, setSavedItems] = useState<Set<string>>(new Set());
  
  // Memoize sorted results to prevent unnecessary re-renders
  const sortedResults = useMemo(() => {
    return [...results].sort((a, b) => {
      // First sort by confidence (higher first)
      if (a.confidence !== b.confidence) {
        return b.confidence - a.confidence;
      }
      // If confidence is equal, sort by number of streaming sources (more sources first)
      const aStreamingCount = a.streamingSources?.length || 0;
      const bStreamingCount = b.streamingSources?.length || 0;
      return bStreamingCount - aStreamingCount;
    });
  }, [results]);

  // Check which items are already in watchlist
  useEffect(() => {
    // Only check if we have results and they haven't been checked yet
    if (sortedResults.length === 0 || savedItems.size > 0) {
      return;
    }
    
    const checkSavedItems = async () => {
      const saved = new Set<string>();
      for (const item of sortedResults) {
        const isInWatchlist = await WatchlistService.isInWatchlist(item.title, item.year);
        if (isInWatchlist) {
          saved.add(`${item.title}-${item.year}`);
        }
      }
      setSavedItems(saved);
    };
    
    checkSavedItems();
  }, [sortedResults, savedItems.size]); // Only depend on results and whether we've already checked

  const handleSaveToWatchlist = async (item: DetectedContent) => {
    const key = `${item.title}-${item.year}`;
    const isCurrentlySaved = savedItems.has(key);
    
    if (isCurrentlySaved) {
      // Remove from watchlist
      const { success, error } = await WatchlistService.removeFromWatchlist(item.title, item.year);
      if (success) {
        setSavedItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(key);
          return newSet;
        });
        console.log(`${item.title} has been removed from your watchlist.`);
      } else {
        console.error('Failed to remove from watchlist:', error);
      }
    } else {
      // Add to watchlist
      const { success, error } = await WatchlistService.addToWatchlist(item);
      if (success) {
        setSavedItems(prev => new Set(prev).add(key));
        console.log(`${item.title} has been saved to your watchlist.`);
      } else {
        console.error('Failed to add to watchlist:', error);
      }
    }
  };
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Analysis Complete!</h2>
        <p className="text-muted-foreground">
          Found {sortedResults.length} matching {sortedResults.length === 1 ? 'title' : 'titles'}
        </p>
      </div>

      <div className="grid gap-6">
        {sortedResults.map((content, index) => (
          <Card key={index} className="result-card p-6">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-shrink-0">
                <img
                  src={content.poster}
                  alt={content.title}
                  className={`object-cover rounded-lg shadow-lg ${
                    content.type === 'youtube' ? 'w-48 h-28' : 'w-32 h-48'
                  }`}
                />
              </div>

              <div className="flex-1 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <h3 className="text-xl font-bold">{content.title}</h3>
                    <Badge className={typeColors[content.type]}>
                      {content.type.toUpperCase()}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {content.year}
                    </div>
                    {content.runtime && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {content.runtime}
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      {content.rating}/10
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {content.genre.map((g) => (
                      <Badge key={g} variant="secondary">
                        {g}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <p className="text-muted-foreground line-clamp-3">{content.plot}</p>
                
                {/* Save to Watchlist Button */}
                <div className="flex gap-2 mb-4">
                  <Button
                    onClick={() => handleSaveToWatchlist(content)}
                    variant={savedItems.has(`${content.title}-${content.year}`) ? "default" : "outline"}
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    {savedItems.has(`${content.title}-${content.year}`) ? (
                      <>
                        <BookmarkCheck className="w-4 h-4" />
                        Saved
                      </>
                    ) : (
                      <>
                        <Bookmark className="w-4 h-4" />
                        Save to Watchlist
                      </>
                    )}
                  </Button>
                </div>


                <div className="space-y-3">
                  {content.type === 'youtube' ? (
                    <>
                      <h4 className="font-semibold">Watch on YouTube:</h4>
                      <Button
                        variant="outline"
                        className="flex items-center justify-between p-4 h-auto w-full"
                        asChild
                      >
                        <a href={content.youtubeUrl || `https://youtube.com/search?q=${encodeURIComponent(content.title)}`} target="_blank" rel="noopener noreferrer">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-red-500 rounded flex items-center justify-center">
                              <span className="text-white font-bold text-xs">YT</span>
                            </div>
                            <div className="text-left">
                              <div className="font-medium">YouTube</div>
                              {content.channelName && (
                                <div className="text-xs text-muted-foreground">
                                  {content.channelName}
                                </div>
                              )}
                            </div>
                          </div>
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </>
                  ) : content.streamingSources && content.streamingSources.length > 0 ? (
                <>
                  <h4 className="font-semibold">Available on:</h4>
                  <div className="flex flex-col gap-2">
                    {(() => {
                      // Group streaming sources by service name
                      const groupedSources = content.streamingSources.reduce((acc: any, source: any) => {
                        if (!acc[source.name]) {
                          acc[source.name] = {
                            name: source.name,
                            url: source.url, // Use the first URL found
                            types: []
                          };
                        }
                        if (!acc[source.name].types.find((t: any) => t.type === source.type)) {
                          acc[source.name].types.push({
                            type: source.type,
                            price: source.price
                          });
                        }
                        return acc;
                      }, {});

                      return Object.values(groupedSources).map((service: any, idx: number) => {
                        console.log(`Streaming service ${service.name}: ${service.url}`);
                        return (
                          <Button
                            key={idx}
                            variant="outline"
                            className="flex items-center justify-between p-3 h-auto w-full"
                            asChild
                          >
                            <a href={service.url} target="_blank" rel="noopener noreferrer"
                               onClick={() => console.log(`Opening streaming link: ${service.url}`)}>
                              <div className="flex items-center gap-3">
                                <StreamingIcon 
                                  serviceId={service.name.toLowerCase().replace(/[^a-z0-9]/g, '')}
                                  serviceName={service.name}
                                  className="w-8 h-8 flex-shrink-0"
                                />
                                                              <div className="text-left flex-1 min-w-0">
                                  <div className="font-medium truncate">{service.name}</div>
                                </div>
                            </div>
                            <ExternalLink className="h-4 w-4 flex-shrink-0 ml-2" />
                          </a>
                        </Button>
                        );
                      });
                    })()}
                  </div>
                </>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-muted-foreground mb-2">No streaming sources found</p>
                      {content.releaseDate && (
                        <p className="text-sm text-muted-foreground">
                          Release Date: {content.releaseDate}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    Confidence: {Math.round(content.confidence * 100)}%
                  </p>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="text-center">
        <Button variant="glow" onClick={onNewSearch}>
          Analyze Another Image
        </Button>
      </div>
    </div>
  );
};