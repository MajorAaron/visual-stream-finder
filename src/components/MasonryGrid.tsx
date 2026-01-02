import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface MasonryGridProps {
  children: ReactNode;
  className?: string;
}

export function MasonryGrid({ children, className = '' }: MasonryGridProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4',
        className
      )}
    >
      {children}
    </div>
  );
}
