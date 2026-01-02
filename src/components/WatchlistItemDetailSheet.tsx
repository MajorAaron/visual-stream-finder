import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ExternalLink, Star, Clock, Calendar, Trash2, RotateCcw, Eye } from 'lucide-react';
import { StreamingIcon } from '@/components/StreamingIcon';

const typeColors: Record<string, string> = {
  movie: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  tv: 'bg-green-500/20 text-green-400 border-green-500/30',
  documentary: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  youtube: 'bg-red-500/20 text-red-400 border-red-500/30',
};

interface WatchlistItem {
  id: string;
  title: string;
  year: number;
  type: 'movie' | 'tv' | 'documentary' | 'youtube';
  genre?: string[];
  rating?: number;
  runtime?: string;
  plot?: string;
  poster?: string;
  streaming_sources?: any[];
  confidence?: number;
  youtube_url?: string;
  channel_name?: string;
  watched?: boolean;
  favorite?: boolean;
}

interface WatchlistItemDetailSheetProps {
  item: WatchlistItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFavorite?: (title: string, year: number, favorite: boolean) => void;
  onMarkAsWatched?: (title: string, year: number) => void;
  onMarkAsUnwatched?: (title: string, year: number) => void;
  onRemove?: (title: string, year: number) => void;
  variant?: 'watchlist' | 'watched' | 'favorites';
}

export function WatchlistItemDetailSheet({
  item,
  open,
  onOpenChange,
  onFavorite,
  onMarkAsWatched,
  onMarkAsUnwatched,
  onRemove,
  variant = 'watchlist',
}: WatchlistItemDetailSheetProps) {
  if (!item) return null;

  const groupedSources = item.streaming_sources?.reduce((acc: any, source: any) => {
    if (!acc[source.name]) {
      acc[source.name] = { name: source.name, url: source.url, types: [] };
    }
    if (!acc[source.name].types.find((t: any) => t.type === source.type)) {
      acc[source.name].types.push({ type: source.type, price: source.price });
    }
    return acc;
  }, {}) || {};

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] overflow-y-auto rounded-t-xl">
        <SheetHeader className="text-left pb-4">
          <div className="flex items-start gap-4">
            <div className={`flex-shrink-0 ${item.type === 'youtube' ? 'w-32 aspect-video' : 'w-24 aspect-[2/3]'}`}>
              <img
                src={item.poster || 'https://images.unsplash.com/photo-1489599904821-6ef46474ebc3?w=300&h=450&fit=crop'}
                alt={`${item.title} poster`}
                className="w-full h-full object-cover rounded-lg"
              />
            </div>
            <div className="flex-1 min-w-0">
              {item.type === 'youtube' && item.youtube_url ? (
                <a
                  href={item.youtube_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xl line-clamp-2 mb-2 font-semibold hover:underline text-primary block"
                >
                  {item.title}
                </a>
              ) : (
                <SheetTitle className="text-xl line-clamp-2 mb-2">{item.title}</SheetTitle>
              )}
              <Badge variant="outline" className={`${typeColors[item.type]} text-xs mb-3`}>
                {item.type.toUpperCase()}
              </Badge>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {item.year}
                </div>
                {item.runtime && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {item.runtime}
                  </div>
                )}
                {item.rating && (
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    {item.rating}/10
                  </div>
                )}
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-4">
          {/* Genres */}
          {item.genre && item.genre.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {item.genre.map((g) => (
                <Badge key={g} variant="secondary" className="text-xs">
                  {g}
                </Badge>
              ))}
            </div>
          )}

          {/* Plot */}
          {item.plot && (
            <p className="text-sm text-muted-foreground leading-relaxed">{item.plot}</p>
          )}

          {/* Streaming Sources / YouTube Link */}
          <div className="space-y-3">
            {item.type === 'youtube' || item.youtube_url ? (
              <>
                <h4 className="font-semibold text-sm">Watch on YouTube:</h4>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-auto p-3 justify-start w-full"
                  onClick={() => window.open(item.youtube_url || `https://youtube.com/search?q=${encodeURIComponent(item.title)}`, '_blank')}
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className="w-6 h-6 bg-red-500 rounded flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-xs">YT</span>
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="font-medium text-sm">YouTube</div>
                      {item.channel_name && (
                        <div className="text-xs text-muted-foreground truncate">
                          {item.channel_name}
                        </div>
                      )}
                    </div>
                    <ExternalLink className="w-4 h-4 flex-shrink-0" />
                  </div>
                </Button>
              </>
            ) : item.streaming_sources && item.streaming_sources.length > 0 ? (
              <>
                <h4 className="font-semibold text-sm">Available on:</h4>
                <div className="grid grid-cols-2 gap-2">
                  {Object.values(groupedSources).slice(0, 6).map((service: any, index: number) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      className="h-auto p-3 justify-start"
                      onClick={() => window.open(service.url, '_blank')}
                    >
                      <div className="flex items-center gap-2 w-full">
                        <StreamingIcon
                          serviceId={service.name.toLowerCase().replace(/[^a-z0-9]/g, '')}
                          serviceName={service.name}
                          className="w-5 h-5 flex-shrink-0"
                        />
                        <div className="flex-1 text-left min-w-0">
                          <div className="font-medium text-xs truncate">{service.name}</div>
                        </div>
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </div>
                    </Button>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-4 border border-dashed rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">No streaming sources found</p>
                <p className="text-sm text-muted-foreground">Release Date: {item.year}</p>
              </div>
            )}
          </div>

          {/* Confidence */}
          {item.confidence && (
            <div className="text-xs text-muted-foreground">
              Confidence: {Math.round(item.confidence * 100)}%
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2 pt-2 border-t">
            {onFavorite && (
              <Button
                onClick={() => {
                  onFavorite(item.title, item.year, !item.favorite);
                  onOpenChange(false);
                }}
                variant="outline"
                className={`w-full h-12 ${item.favorite ? 'text-yellow-500 hover:text-yellow-600 hover:bg-yellow-50' : ''}`}
              >
                <Star className={`w-5 h-5 mr-2 ${item.favorite ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                {item.favorite ? 'Unfavorite' : 'Add to Favorites'}
              </Button>
            )}

            {variant === 'watchlist' && onMarkAsWatched && (
              <Button
                onClick={() => {
                  onMarkAsWatched(item.title, item.year);
                  onOpenChange(false);
                }}
                variant="outline"
                className="w-full h-12 text-green-500 hover:text-green-600 hover:bg-green-50"
              >
                <Eye className="w-5 h-5 mr-2" />
                Mark as Watched
              </Button>
            )}

            {variant === 'watched' && onMarkAsUnwatched && (
              <Button
                onClick={() => {
                  onMarkAsUnwatched(item.title, item.year);
                  onOpenChange(false);
                }}
                variant="outline"
                className="w-full h-12 text-blue-500 hover:text-blue-600 hover:bg-blue-50"
              >
                <RotateCcw className="w-5 h-5 mr-2" />
                Mark as Unwatched
              </Button>
            )}

            {onRemove && (
              <Button
                onClick={() => {
                  onRemove(item.title, item.year);
                  onOpenChange(false);
                }}
                variant="outline"
                className="w-full h-12 text-red-500 hover:text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-5 h-5 mr-2" />
                Remove
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
