import { useNavigate, useLocation } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FloatingAddButtonProps {
  className?: string;
}

export function FloatingAddButton({ className }: FloatingAddButtonProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleClick = () => {
    navigate('/search');
  };

  // Don't show the button on the Index page (add to watchlist page)
  if (location.pathname === '/search') {
    return null;
  }

  return (
    <Button
      onClick={handleClick}
      size="icon"
      className={cn(
        "fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50",
        "bg-primary hover:bg-primary/90 transition-all duration-200",
        "hover:scale-110 active:scale-95",
        className
      )}
      aria-label="Add to watchlist"
    >
      <Plus className="h-6 w-6" />
    </Button>
  );
}