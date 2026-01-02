import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Clock, Calendar, Trash2, RotateCcw, Eye } from 'lucide-react';

const typeColors: Record<string, string> = {
  movie: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  tv: 'bg-green-500/20 text-green-400 border-green-500/30',
  documentary: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  youtube: 'bg-red-500/20 text-red-400 border-red-500/30',
};

export interface MediaItem {
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

interface MediaCardProps {
  item: MediaItem;
  onCardClick: () => void;
  onFavorite?: () => void;
  onMarkAsWatched?: () => void;
  onMarkAsUnwatched?: () => void;
  onRemove?: () => void;
  variant?: 'watchlist' | 'watched' | 'favorites';
}

export function MediaCard({
  item,
  onCardClick,
  onFavorite,
  onMarkAsWatched,
  onMarkAsUnwatched,
  onRemove,
  variant = 'watchlist',
}: MediaCardProps) {
  return (
    <Card className="overflow-hidden w-full shadow-lg hover:shadow-xl transition-shadow duration-200">
      {/* Mobile: Horizontal card - tap to open details */}
      <div
        className="sm:hidden cursor-pointer flex"
        onClick={onCardClick}
      >
        <div className={`flex-shrink-0 ${item.type === 'youtube' ? 'w-32' : 'w-24'} relative`}>
          <img
            src={item.poster || 'https://images.unsplash.com/photo-1489599904821-6ef46474ebc3?w=300&h=450&fit=crop'}
            alt={`${item.title} poster`}
            className={`w-full object-cover rounded-l-lg ${item.type === 'youtube' ? 'aspect-video' : 'aspect-[2/3]'}`}
          />
          {item.favorite && (
            <div className="absolute top-2 right-2">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400 drop-shadow-md" />
            </div>
          )}
        </div>
        <CardContent className="flex-1 p-3 flex flex-col justify-center min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-base line-clamp-2 flex-1">{item.title}</h3>
            <Badge variant="outline" className={`${typeColors[item.type]} text-xs flex-shrink-0`}>
              {item.type.toUpperCase()}
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>{item.year}</span>
            {item.rating && (
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                {item.rating}/10
              </div>
            )}
          </div>
          {item.genre && item.genre.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {item.genre.slice(0, 3).join(' · ')}
            </p>
          )}
        </CardContent>
      </div>

      {/* Desktop: Vertical card */}
      <div className="hidden sm:block">
        <div
          className="cursor-pointer"
          onClick={onCardClick}
        >
          <div className={`overflow-hidden ${item.type === 'youtube' ? 'aspect-video' : 'aspect-[2/3]'} relative`}>
            <img
              src={item.poster || 'https://images.unsplash.com/photo-1489599904821-6ef46474ebc3?w=300&h=450&fit=crop'}
              alt={`${item.title} poster`}
              className="w-full h-full object-cover transition-transform hover:scale-105"
            />
            {item.favorite && (
              <div className="absolute top-2 right-2">
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400 drop-shadow-lg" />
              </div>
            )}
            <Badge
              variant="outline"
              className={`absolute top-2 left-2 ${typeColors[item.type]} text-xs backdrop-blur-sm`}
            >
              {item.type.toUpperCase()}
            </Badge>
          </div>
        </div>

        <CardContent className="p-3">
          <div className="space-y-2">
            {/* Title and metadata */}
            <div>
              <h3
                className="font-bold text-base line-clamp-2 cursor-pointer hover:text-primary transition-colors"
                onClick={onCardClick}
              >
                {item.title}
              </h3>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {item.year}
                </div>
                {item.runtime && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {item.runtime}
                  </div>
                )}
                {item.rating && (
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    {item.rating}/10
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-1.5 pt-1">
              {onFavorite && (
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    onFavorite();
                  }}
                  variant="outline"
                  size="sm"
                  className={`flex-1 h-8 text-xs px-2 ${item.favorite ? 'text-yellow-500 hover:text-yellow-600' : ''}`}
                >
                  <Star className={`w-3.5 h-3.5 mr-1 ${item.favorite ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                  {item.favorite ? 'Unfav' : 'Fav'}
                </Button>
              )}

              {variant === 'watchlist' && onMarkAsWatched && (
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkAsWatched();
                  }}
                  variant="outline"
                  size="sm"
                  className="flex-1 h-8 text-xs px-2 text-green-500 hover:text-green-600"
                >
                  <Eye className="w-3.5 h-3.5 mr-1" />
                  Seen
                </Button>
              )}

              {variant === 'watched' && onMarkAsUnwatched && (
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkAsUnwatched();
                  }}
                  variant="outline"
                  size="sm"
                  className="flex-1 h-8 text-xs px-2 text-blue-500 hover:text-blue-600"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1" />
                  Unsee
                </Button>
              )}

              {onRemove && (
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove();
                  }}
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs px-2 text-red-500 hover:text-red-600"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}
