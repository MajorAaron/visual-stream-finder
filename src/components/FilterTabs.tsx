import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type FilterType = 'all' | 'movies' | 'tv' | 'unwatched';

interface FilterTabsProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  showUnwatched?: boolean;
  className?: string;
}

interface FilterOption {
  value: FilterType;
  label: string;
}

const defaultFilters: FilterOption[] = [
  { value: 'all', label: 'All' },
  { value: 'movies', label: 'Movies' },
  { value: 'tv', label: 'TV Shows' },
];

const watchlistFilters: FilterOption[] = [
  ...defaultFilters,
  { value: 'unwatched', label: 'Unwatched' },
];

export function FilterTabs({
  activeFilter,
  onFilterChange,
  showUnwatched = false,
  className,
}: FilterTabsProps) {
  const filters = showUnwatched ? watchlistFilters : defaultFilters;

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {filters.map((filter) => {
        const isActive = activeFilter === filter.value;
        return (
          <Button
            key={filter.value}
            onClick={() => onFilterChange(filter.value)}
            variant={isActive ? 'default' : 'outline'}
            size="sm"
            className={cn(
              'rounded-full px-4 transition-all duration-200',
              isActive
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                : 'border-border text-muted-foreground hover:text-foreground hover:border-primary/50'
            )}
          >
            {filter.label}
          </Button>
        );
      })}
    </div>
  );
}
