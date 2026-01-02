import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { extractUniqueStreamingSources } from '@/utils/watchlistFilters';
import { WatchlistItem } from '@/utils/watchlistService';

interface StreamingSourceFilterProps {
  items: WatchlistItem[];
  selectedSource: string | null;
  onSourceChange: (source: string | null) => void;
}

export function StreamingSourceFilter({
  items,
  selectedSource,
  onSourceChange,
}: StreamingSourceFilterProps) {
  const uniqueSources = extractUniqueStreamingSources(items);

  if (uniqueSources.length === 0) {
    return null; // Don't show filter if no streaming sources available
  }

  return (
    <Select
      value={selectedSource || 'all'}
      onValueChange={(value) => onSourceChange(value === 'all' ? null : value)}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Filter by service" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Services</SelectItem>
        {uniqueSources.map((source) => (
          <SelectItem key={source} value={source}>
            {source}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
