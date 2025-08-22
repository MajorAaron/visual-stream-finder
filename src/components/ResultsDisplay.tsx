import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Star, Clock, Calendar, Bookmark, BookmarkCheck } from 'lucide-react';
import { WatchlistService } from '@/utils/watchlistService';
import { useToast } from '@/components/ui/use-toast';
import { DetectedContent } from '@/utils/aiAnalysis';

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

const sourceTypeColors = {
  subscription: 'bg-primary/20 text-primary',
  rent: 'bg-warning/20 text-warning',
  buy: 'bg-destructive/20 text-destructive',
  free: 'bg-success/20 text-success'
};

export const ResultsDisplay = ({ results, onNewSearch }: ResultsDisplayProps) => {
  const [savedItems, setSavedItems] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Check which items are already in watchlist
  useEffect(() => {
    const checkSavedItems = async () => {
      const saved = new Set<string>();
      for (const item of results) {
        const isInWatchlist = await WatchlistService.isInWatchlist(item.title, item.year);
        if (isInWatchlist) {
          saved.add(`${item.title}-${item.year}`);
        }
      }
      setSavedItems(saved);
    };
    
    checkSavedItems();
  }, [results]);

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
        toast({
          title: "Removed from Watchlist",
          description: `${item.title} has been removed from your watchlist.`,
        });
      } else {
        toast({
          title: "Error",
          description: error || "Failed to remove from watchlist",
          variant: "destructive",
        });
      }
    } else {
      // Add to watchlist
      const { success, error } = await WatchlistService.addToWatchlist(item);
      if (success) {
        setSavedItems(prev => new Set(prev).add(key));
        toast({
          title: "Added to Watchlist",
          description: `${item.title} has been saved to your watchlist.`,
        });
      } else {
        toast({
          title: "Error",
          description: error || "Failed to add to watchlist",
          variant: "destructive",
        });
      }
    }
  };
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Analysis Complete!</h2>
        <p className="text-muted-foreground">
          Found {results.length} matching {results.length === 1 ? 'title' : 'titles'}
        </p>
      </div>

      <div className="grid gap-6">
        {results.map((content, index) => (
          <Card key={index} className="result-card p-6">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-shrink-0">
                <img
                  src={content.poster}
                  alt={content.title}
                  className="w-32 h-48 object-cover rounded-lg shadow-lg"
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
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {content.streamingSources.map((source, idx) => (
                          <Button
                            key={idx}
                            variant="outline"
                            className="flex items-center justify-between p-4 h-auto"
                            asChild
                          >
                            <a href={source.url} target="_blank" rel="noopener noreferrer">
                              <div className="flex items-center gap-3">
                                <img
                                  src={source.logo}
                                  alt={source.name}
                                  className="w-8 h-8 rounded"
                                />
                                <div className="text-left">
                                  <div className="font-medium">{source.name}</div>
                                  <div className="flex items-center gap-2">
                                    <Badge className={sourceTypeColors[source.type]} variant="secondary">
                                      {source.type}
                                    </Badge>
                                    {source.price && (
                                      <span className="text-xs text-muted-foreground">
                                        {source.price}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        ))}
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