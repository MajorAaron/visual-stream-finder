import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowUpDown } from 'lucide-react';

export type SortOption = 'date-added' | 'title' | 'rating' | 'year';

interface SortDropdownProps {
  value: SortOption;
  onValueChange: (value: SortOption) => void;
  className?: string;
}

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'date-added', label: 'Date Added' },
  { value: 'title', label: 'Title' },
  { value: 'rating', label: 'Rating' },
  { value: 'year', label: 'Year' },
];

export function SortDropdown({ value, onValueChange, className }: SortDropdownProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={className}>
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4" />
          <span className="hidden sm:inline">Sort by:</span>
          <SelectValue />
        </div>
      </SelectTrigger>
      <SelectContent>
        {sortOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
