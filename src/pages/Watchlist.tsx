import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Star, ArrowLeft } from 'lucide-react';
import { useWatchlist } from '@/hooks/useWatchlist';
import { useAuth } from '@/hooks/useAuth';
import { MediaCard } from '@/components/MediaCard';
import { MasonryGrid } from '@/components/MasonryGrid';
import { WatchlistItemDetailSheet } from '@/components/WatchlistItemDetailSheet';
import { StreamingSourceFilter } from '@/components/StreamingSourceFilter';
import { filterByStreamingSource } from '@/utils/watchlistFilters';

export default function Watchlist() {
  const { user, signOut } = useAuth();
  const { watchlist, loading, removeFromWatchlist, markAsWatched, setFavorite } = useWatchlist();
  const [selectedItem, setSelectedItem] = useState<typeof watchlist[0] | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);

  const filteredWatchlist = useMemo(() => {
    return filterByStreamingSource(watchlist, selectedSource);
  }, [watchlist, selectedSource]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Link to="/search">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Search
                </Button>
              </Link>
              <div className="min-w-0 flex-1 sm:flex-none">
                <h1 className="text-xl sm:text-2xl font-bold text-primary">My Watchlist</h1>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {selectedSource 
                    ? `${filteredWatchlist.length} of ${watchlist.length} items`
                    : `${watchlist.length} saved items`
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-end">
              <Link to="/watched">
                <Button variant="outline" size="sm">Watched</Button>
              </Link>
              <Link to="/favorites">
                <Button variant="outline" size="sm">Favorites</Button>
              </Link>
              <span className="hidden sm:inline text-sm text-muted-foreground truncate max-w-[120px]">
                {user?.user_metadata?.full_name || user?.email}
              </span>
              <Button onClick={signOut} variant="outline" size="sm">
                Sign Out
              </Button>
            </div>
          </div>
          {watchlist.length > 0 && (
            <div className="mt-3 sm:mt-0">
              <StreamingSourceFilter
                items={watchlist}
                selectedSource={selectedSource}
                onSourceChange={setSelectedSource}
              />
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {watchlist.length === 0 ? (
          <div className="text-center py-12 sm:py-16 px-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Star className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold mb-2">Your watchlist is empty</h2>
            <p className="text-muted-foreground mb-6 text-sm sm:text-base">
              Start discovering movies and TV shows to build your personal watchlist
            </p>
            <Link to="/search">
              <Button>Start Analyzing Images</Button>
            </Link>
          </div>
        ) : filteredWatchlist.length === 0 ? (
          <div className="text-center py-12 sm:py-16 px-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Star className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold mb-2">No items found</h2>
            <p className="text-muted-foreground mb-6 text-sm sm:text-base">
              No items available on {selectedSource}
            </p>
            <Button onClick={() => setSelectedSource(null)} variant="outline">
              Clear Filter
            </Button>
          </div>
        ) : (
          <MasonryGrid>
            {filteredWatchlist.map((item) => (
              <div key={item.id} className="mb-3 sm:mb-4">
                <MediaCard
                  item={item}
                  variant="watchlist"
                  onCardClick={() => {
                    setSelectedItem(item);
                    setSheetOpen(true);
                  }}
                  onFavorite={() => setFavorite(item.title, item.year, !item.favorite)}
                  onMarkAsWatched={() => markAsWatched(item.title, item.year)}
                  onRemove={() => removeFromWatchlist(item.title, item.year)}
                />
              </div>
            ))}
          </MasonryGrid>
        )}
      </div>

      {/* Detail sheet */}
      <WatchlistItemDetailSheet
        item={selectedItem}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onFavorite={setFavorite}
        onMarkAsWatched={markAsWatched}
        onRemove={removeFromWatchlist}
        variant="watchlist"
      />
    </div>
  );
}
