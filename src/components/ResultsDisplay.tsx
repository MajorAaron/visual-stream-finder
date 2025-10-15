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

      <div className="grid gap-4 md:gap-6">
        {sortedResults.map((content, index) => (
          <Card key={index} className="result-card overflow-hidden">
            <div className="flex gap-4">
              {/* Poster Image */}
              <div className="flex-shrink-0 w-24 sm:w-32">
                <img
                  src={content.poster}
                  alt={content.title}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Main Content */}
              <div className="flex-1 p-4 space-y-3">
                <div className="flex justify-between items-start gap-2">
                  <h3 className="text-lg sm:text-xl font-bold leading-tight">
                    {content.title}
                  </h3>
                  <Badge className={`flex-shrink-0 ${typeColors[content.type]}`}>
                    {content.type.toUpperCase()}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{content.year}</span>
                  </div>
                  {content.runtime && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{content.runtime}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                    <span>{content.rating}/10</span>
                  </div>
                </div>

                {/* Save to Watchlist Button */}
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleSaveToWatchlist(content)}
                    variant={savedItems.has(`${content.title}-${content.year}`) ? "default" : "outline"}
                    size="sm"
                    className="flex items-center gap-1.5 px-2.5 py-1 h-auto text-xs sm:text-sm"
                  >
                    {savedItems.has(`${content.title}-${content.year}`) ? (
                      <>
                        <BookmarkCheck className="w-3.5 h-3.5" />
                        <span>Saved</span>
                      </>
                    ) : (
                      <>
                        <Bookmark className="w-3.5 h-3.5" />
                        <span>Save</span>
                      </>
                    )}
                  </Button>
                </div>

                <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 sm:line-clamp-3">
                  {content.plot}
                </p>

                {/* Streaming Sources */}
                <div className="pt-2">
                  {content.streamingSources && content.streamingSources.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {content.streamingSources.slice(0, 4).map((source, idx) => (
                        <a
                          href={source.url}
                          key={idx}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="transition-transform hover:scale-110"
                        >
                          <StreamingIcon
                            serviceId={source.name.toLowerCase().replace(/[^a-z0-9]/g, '')}
                            serviceName={source.name}
                            className="w-7 h-7 sm:w-8 sm:h-8"
                          />
                        </a>
                      ))}
                    </div>
                  ) : (
                    content.releaseDate && (
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Releases: {content.releaseDate}
                      </p>
                    )
                  )}
                </div>

                <div className="pt-2 text-right">
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