import Masonry from 'react-masonry-css';
import { ReactNode } from 'react';

interface MasonryGridProps {
  children: ReactNode;
  className?: string;
}

// Breakpoints matching Tailwind: 1 col mobile, 2 sm, 3 md, 4 lg, 5 xl
const breakpointColumns = {
  default: 5,  // xl and above
  1280: 5,     // xl (1280px)
  1024: 4,     // lg (1024px)
  768: 3,      // md (768px)
  640: 2,      // sm (640px)
  0: 1,        // mobile
};

export function MasonryGrid({ children, className = '' }: MasonryGridProps) {
  return (
    <Masonry
      breakpointCols={breakpointColumns}
      className={`flex -ml-3 sm:-ml-4 w-auto ${className}`}
      columnClassName="pl-3 sm:pl-4 bg-clip-padding"
    >
      {children}
    </Masonry>
  );
}
