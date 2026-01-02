import { Link, useLocation } from 'react-router-dom';
import { Home, Search, List, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TabItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

const tabs: TabItem[] = [
  { label: 'Home', path: '/', icon: Home },
  { label: 'Discover', path: '/search', icon: Search },
  { label: 'Watchlist', path: '/watchlist', icon: List },
  { label: 'Profile', path: '/profile', icon: User },
];

export function BottomTabBar() {
  const location = useLocation();

  const isActive = (path: string) => {
    // Root path should match both / and /watchlist for the Home tab
    if (path === '/') {
      return location.pathname === '/' || location.pathname === '/watchlist';
    }
    return location.pathname === path;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 safe-area-inset-bottom">
      <div className="flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab.path);

          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors duration-200',
                active ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <Icon
                className={cn(
                  'w-6 h-6 transition-all duration-200',
                  active ? 'fill-primary stroke-primary' : 'stroke-current'
                )}
              />
              <span className="text-xs font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
