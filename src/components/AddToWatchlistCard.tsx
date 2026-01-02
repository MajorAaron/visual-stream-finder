import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface AddToWatchlistCardProps {
  className?: string;
}

export function AddToWatchlistCard({ className }: AddToWatchlistCardProps) {
  const navigate = useNavigate();

  return (
    <Card
      onClick={() => navigate('/search')}
      className={cn(
        'aspect-[2/3] border-2 border-dashed border-muted-foreground/30 bg-secondary/20',
        'hover:border-primary/50 hover:bg-secondary/40 transition-all duration-200',
        'cursor-pointer flex flex-col items-center justify-center gap-3 group',
        className
      )}
    >
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
        <Plus className="w-8 h-8 text-primary" />
      </div>
      <div className="text-center px-4">
        <p className="text-sm font-semibold text-foreground">Add to Watchlist</p>
        <p className="text-xs text-muted-foreground mt-1">Search for content</p>
      </div>
    </Card>
  );
}
