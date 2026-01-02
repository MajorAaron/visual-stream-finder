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
      <CardContent className="p-3 space-y-2">
        {/* Title Only */}
        <div className="cursor-pointer" onClick={onCardClick}>
          <h3 className="font-semibold text-base line-clamp-2 hover:text-primary transition-colors">
            {item.title}
          </h3>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-1">
          {/* Favorite Button */}
          {onFavorite && (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onFavorite();
              }}
              variant="ghost"
              size="icon"
              className={cn(
                'h-10 w-10 rounded-full',
                item.favorite ? 'text-yellow-500 hover:text-yellow-600' : 'text-muted-foreground hover:text-yellow-400'
              )}
              title="Toggle favorite"
            >
              <Star className={cn('w-5 h-5', item.favorite && 'fill-yellow-400')} />
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
              size="icon"
              className="h-10 w-10 rounded-full text-muted-foreground hover:text-green-500"
              title="Mark as watched"
            >
              <Eye className="w-5 h-5" />
            </Button>
          )}

          {variant === 'watched' && onMarkAsUnwatched && (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onMarkAsUnwatched();
              }}
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full text-muted-foreground hover:text-blue-500"
              title="Mark as unwatched"
            >
              <RotateCcw className="w-5 h-5" />
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
              size="icon"
              className="h-10 w-10 rounded-full text-muted-foreground hover:text-destructive"
              title="Remove from list"
            >
              <Trash2 className="w-5 h-5" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
