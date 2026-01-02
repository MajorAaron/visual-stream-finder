import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Star, ArrowLeft } from 'lucide-react';
import { useWatchedItems } from '@/hooks/useWatchlist';
import { WatchlistService } from '@/utils/watchlistService';
import { useAuth } from '@/hooks/useAuth';
import { MediaCard } from '@/components/MediaCard';
import { MasonryGrid } from '@/components/MasonryGrid';
import { WatchlistItemDetailSheet } from '@/components/WatchlistItemDetailSheet';

export default function Watched() {
  const { user, signOut } = useAuth();
  const { watchedItems, loading, markAsUnwatched, removeFromWatchlist, refreshWatchedItems } = useWatchedItems();
  const [selectedItem, setSelectedItem] = useState<typeof watchedItems[0] | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const handleFavorite = async (title: string, year: number, favorite: boolean) => {
    const { success } = await WatchlistService.setFavorite(title, year, favorite);
    if (success) await refreshWatchedItems();
  };

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
                <h1 className="text-xl sm:text-2xl font-bold text-primary">Watched</h1>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {watchedItems.length} watched items
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-end">
              <Link to="/watchlist">
                <Button variant="outline" size="sm">Watchlist</Button>
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
        </div>
      </header>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {watchedItems.length === 0 ? (
          <div className="text-center py-12 sm:py-16 px-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Star className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold mb-2">No watched items yet</h2>
            <p className="text-muted-foreground mb-6 text-sm sm:text-base">
              Items you mark as watched will appear here
            </p>
            <Link to="/watchlist">
              <Button>Go to Watchlist</Button>
            </Link>
          </div>
        ) : (
          <MasonryGrid>
            {watchedItems.map((item) => (
              <div key={item.id} className="mb-3 sm:mb-4">
                <MediaCard
                  item={item}
                  variant="watched"
                  onCardClick={() => {
                    setSelectedItem(item);
                    setSheetOpen(true);
                  }}
                  onFavorite={() => handleFavorite(item.title, item.year, !item.favorite)}
                  onMarkAsUnwatched={() => markAsUnwatched(item.title, item.year)}
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
        onFavorite={handleFavorite}
        onMarkAsUnwatched={markAsUnwatched}
        onRemove={removeFromWatchlist}
        variant="watched"
      />
    </div>
  );
}
