import { useState, useMemo } from 'react';
import { Eye } from 'lucide-react';
import { useWatchedItems } from '@/hooks/useWatchlist';
import { WatchlistService } from '@/utils/watchlistService';
import { MediaCard } from '@/components/MediaCard';
import { MasonryGrid } from '@/components/MasonryGrid';
import { WatchlistItemDetailSheet } from '@/components/WatchlistItemDetailSheet';
import { StreamingSourceFilter } from '@/components/StreamingSourceFilter';
import { PageHeader } from '@/components/layout/PageHeader';
import { FilterTabs, FilterType } from '@/components/FilterTabs';
import { SortDropdown, SortOption } from '@/components/SortDropdown';
import { AddToWatchlistCard } from '@/components/AddToWatchlistCard';
import { filterByStreamingSource } from '@/utils/watchlistFilters';

export default function Watched() {
  const { watchedItems, loading, markAsUnwatched, removeFromWatchlist, refreshWatchedItems } = useWatchedItems();
  const [selectedItem, setSelectedItem] = useState<typeof watchedItems[0] | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortOption>('date-added');

  // Filter by streaming source
  const sourceFilteredList = useMemo(() => {
    return filterByStreamingSource(watchedItems, selectedSource);
  }, [watchedItems, selectedSource]);

  // Apply type filters
  const typeFilteredList = useMemo(() => {
    if (activeFilter === 'all') return sourceFilteredList;
    if (activeFilter === 'movies') {
      return sourceFilteredList.filter(item => item.type === 'movie');
    }
    if (activeFilter === 'tv') {
      return sourceFilteredList.filter(item => item.type === 'tv');
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
  const filteredWatchedItems = useMemo(() => {
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

  const handleFavorite = async (title: string, year: number, favorite: boolean) => {
    const { success } = await WatchlistService.setFavorite(title, year, favorite);
    if (success) await refreshWatchedItems();
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <PageHeader
          title="Watched"
          itemCount={watchedItems.length}
          showSearch
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
        >
          {/* Filters and Sort */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <FilterTabs
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
            />
            <SortDropdown value={sortBy} onValueChange={setSortBy} className="w-full sm:w-auto" />
          </div>

          {/* Streaming Source Filter */}
          {watchedItems.length > 0 && (
            <StreamingSourceFilter
              items={watchedItems}
              selectedSource={selectedSource}
              onSourceChange={setSelectedSource}
            />
          )}
        </PageHeader>

        {/* Content */}
        {watchedItems.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Eye className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">No watched items yet</h2>
            <p className="text-muted-foreground mb-6">
              Items you mark as watched will appear here
            </p>
          </div>
        ) : filteredWatchedItems.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Eye className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">No items found</h2>
            <p className="text-muted-foreground mb-6">
              {searchQuery ? 'Try a different search term' : 'Try changing your filters'}
            </p>
          </div>
        ) : (
          <MasonryGrid>
            <AddToWatchlistCard />
            {filteredWatchedItems.map((item) => (
              <MediaCard
                key={item.id}
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
