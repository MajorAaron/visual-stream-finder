import { useState, useMemo } from 'react';
import { Star } from 'lucide-react';
import { useWatchlist } from '@/hooks/useWatchlist';
import { MediaCard } from '@/components/MediaCard';
import { MasonryGrid } from '@/components/MasonryGrid';
import { WatchlistItemDetailSheet } from '@/components/WatchlistItemDetailSheet';
import { StreamingSourceFilter } from '@/components/StreamingSourceFilter';
import { PageHeader } from '@/components/layout/PageHeader';
import { FilterTabs, FilterType } from '@/components/FilterTabs';
import { SortDropdown, SortOption } from '@/components/SortDropdown';
import { AddToWatchlistCard } from '@/components/AddToWatchlistCard';
import { filterByStreamingSource } from '@/utils/watchlistFilters';

export default function Watchlist() {
  const { watchlist, loading, removeFromWatchlist, markAsWatched, setFavorite } = useWatchlist();
  const [selectedItem, setSelectedItem] = useState<typeof watchlist[0] | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortOption>('date-added');

  // Filter by streaming source
  const sourceFilteredList = useMemo(() => {
    return filterByStreamingSource(watchlist, selectedSource);
  }, [watchlist, selectedSource]);

  // Apply type filters
  const typeFilteredList = useMemo(() => {
    if (activeFilter === 'all') return sourceFilteredList;
    if (activeFilter === 'movies') {
      return sourceFilteredList.filter(item => item.type === 'movie');
    }
    if (activeFilter === 'tv') {
      return sourceFilteredList.filter(item => item.type === 'tv');
    }
    if (activeFilter === 'unwatched') {
      return sourceFilteredList.filter(item => !item.watched);
    }
    return sourceFilteredList;
  }, [sourceFilteredList, activeFilter]);

  // Apply search filter
  const searchFilteredList = useMemo(() => {
    if (!searchQuery.trim()) return typeFilteredList;
    const query = searchQuery.toLowerCase();
    return typeFilteredList.filter(item =>
      item.title.toLowerCase().includes(query) ||
      item.genre?.some(g => g.toLowerCase().includes(query))
    );
  }, [typeFilteredList, searchQuery]);

  // Apply sorting
  const filteredWatchlist = useMemo(() => {
    const sorted = [...searchFilteredList];
    switch (sortBy) {
      case 'title':
        return sorted.sort((a, b) => a.title.localeCompare(b.title));
      case 'rating':
        return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      case 'year':
        return sorted.sort((a, b) => b.year - a.year);
      case 'date-added':
      default:
        return sorted.sort((a, b) => 
          new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        );
    }
  }, [searchFilteredList, sortBy]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <PageHeader
          title="My Watchlist"
          itemCount={watchlist.length}
          showSearch
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
        >
          {/* Filters and Sort */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <FilterTabs
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
              showUnwatched
            />
            <SortDropdown value={sortBy} onValueChange={setSortBy} className="w-full sm:w-auto" />
          </div>

          {/* Streaming Source Filter */}
          {watchlist.length > 0 && (
            <StreamingSourceFilter
              items={watchlist}
              selectedSource={selectedSource}
              onSourceChange={setSelectedSource}
            />
          )}
        </PageHeader>

        {/* Content */}
        {watchlist.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Star className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Your watchlist is empty</h2>
            <p className="text-muted-foreground mb-6">
              Start discovering movies and TV shows to build your personal watchlist
            </p>
          </div>
        ) : filteredWatchlist.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Star className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">No items found</h2>
            <p className="text-muted-foreground mb-6">
              {searchQuery ? 'Try a different search term' : 'Try changing your filters'}
            </p>
          </div>
        ) : (
          <MasonryGrid>
            <AddToWatchlistCard />
            {filteredWatchlist.map((item) => (
              <MediaCard
                key={item.id}
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
