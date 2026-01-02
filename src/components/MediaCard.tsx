import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Trash2, RotateCcw, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

const typeColors: Record<string, string> = {
  movie: 'bg-blue-500/90 text-white border-0',
  tv: 'bg-primary text-primary-foreground border-0',
  documentary: 'bg-purple-500/90 text-white border-0',
  youtube: 'bg-red-500/90 text-white border-0',
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
    <Card className="overflow-hidden bg-card border-border hover:border-primary/50 transition-all duration-200 group">
      {/* Poster Image with Badge */}
      <div
        className="relative cursor-pointer overflow-hidden aspect-[2/3]"
        onClick={onCardClick}
      >
        <img
          src={item.poster || 'https://images.unsplash.com/photo-1489599904821-6ef46474ebc3?w=300&h=450&fit=crop'}
          alt={`${item.title} poster`}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
        />
        
        {/* Type Badge */}
        <Badge
          className={cn(
            'absolute top-2 left-2 text-xs font-semibold px-2 py-1',
            typeColors[item.type]
          )}
        >
          {item.type === 'tv' ? 'TV SERIES' : item.type.toUpperCase()}
        </Badge>

        {/* Favorite Star Indicator */}
        {item.favorite && (
          <div className="absolute top-2 right-2">
            <Star className="w-5 h-5 fill-yellow-400 text-yellow-400 drop-shadow-lg" />
          </div>
        )}
      </div>

      {/* Content Section */}
      <CardContent className="p-4 space-y-3">
        {/* Title and Year */}
        <div className="cursor-pointer" onClick={onCardClick}>
          <h3 className="font-semibold text-base line-clamp-2 mb-1 hover:text-primary transition-colors">
            {item.title}
          </h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{item.year}</span>
            {item.runtime && (
              <>
                <span>•</span>
                <span>{item.runtime}</span>
              </>
            )}
            {item.rating && (
              <>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  <span>{item.rating}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Genre */}
        {item.genre && item.genre.length > 0 && (
          <p className="text-xs text-muted-foreground line-clamp-1">
            {item.genre.slice(0, 2).join(' • ')}
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-2 pt-2">
          {/* Favorite Button */}
          {onFavorite && (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onFavorite();
              }}
              variant="ghost"
              size="sm"
              className={cn(
                'flex-1 h-10 flex flex-col items-center justify-center gap-0.5',
                item.favorite ? 'text-yellow-500 hover:text-yellow-600' : 'text-muted-foreground'
              )}
            >
              <Star className={cn('w-5 h-5', item.favorite && 'fill-yellow-400 text-yellow-400')} />
              <span className="text-xs">FAV</span>
            </Button>
          )}

          {/* Seen/Unsee Button */}
          {variant === 'watchlist' && onMarkAsWatched && (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onMarkAsWatched();
              }}
              variant="ghost"
              size="sm"
              className="flex-1 h-10 flex flex-col items-center justify-center gap-0.5 text-muted-foreground hover:text-green-500"
            >
              <Eye className="w-5 h-5" />
              <span className="text-xs">SEEN</span>
            </Button>
          )}

          {variant === 'watched' && onMarkAsUnwatched && (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onMarkAsUnwatched();
              }}
              variant="ghost"
              size="sm"
              className="flex-1 h-10 flex flex-col items-center justify-center gap-0.5 text-muted-foreground hover:text-blue-500"
            >
              <RotateCcw className="w-5 h-5" />
              <span className="text-xs">UNSEE</span>
            </Button>
          )}

          {/* Remove Button */}
          {onRemove && (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              variant="ghost"
              size="sm"
              className="flex-1 h-10 flex flex-col items-center justify-center gap-0.5 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="w-5 h-5" />
              <span className="text-xs">REMOVE</span>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
