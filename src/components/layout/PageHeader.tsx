import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  itemCount?: number;
  showSearch?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  className?: string;
  children?: React.ReactNode;
}

export function PageHeader({
  title,
  itemCount,
  showSearch,
  searchValue,
  onSearchChange,
  className,
  children,
}: PageHeaderProps) {
  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-foreground">{title}</h1>
          {itemCount !== undefined && (
            <Badge
              variant="secondary"
              className="px-3 py-1 text-sm bg-secondary/50 text-foreground"
            >
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </Badge>
          )}
        </div>
      </div>

      {showSearch && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search watchlist..."
            value={searchValue}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="pl-10 bg-secondary/30 border-border h-11"
          />
        </div>
      )}

      {children}
    </div>
  );
}
