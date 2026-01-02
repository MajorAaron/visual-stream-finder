import { Link, useLocation } from 'react-router-dom';
import { Home, Search, List, Eye, Star, LogOut, Tv } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { label: 'Home', path: '/', icon: Home },
  { label: 'Search', path: '/search', icon: Search },
  { label: 'My Watchlist', path: '/watchlist', icon: List },
  { label: 'Watched', path: '/watched', icon: Eye },
  { label: 'Favorites', path: '/favorites', icon: Star },
];

export function Sidebar() {
  const location = useLocation();
  const { user, signOut } = useAuth();

  const isActive = (path: string) => {
    // Root path should match both / and /watchlist
    if (path === '/') {
      return location.pathname === '/' || location.pathname === '/watchlist';
    }
    return location.pathname === path;
  };

  const getInitials = (email?: string, name?: string) => {
    if (name) {
      const parts = name.split(' ');
      return parts.length > 1
        ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
        : name.substring(0, 2).toUpperCase();
    }
    return email?.substring(0, 2).toUpperCase() || 'AM';
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-card border-r border-border flex flex-col">
      {/* Logo Section */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <Tv className="w-6 h-6 text-primary" />
          </div>
          <span className="text-xl font-bold text-foreground">AI Watchlist</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          return (
            <Link key={item.path} to={item.path}>
              <div
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 relative group',
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                )}
              >
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
                )}
                <Icon className={cn('w-5 h-5', active ? 'text-primary' : '')} />
                <span className="font-medium">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="w-10 h-10 ring-2 ring-primary/20">
            <AvatarImage src={user?.user_metadata?.avatar_url} />
            <AvatarFallback className="bg-primary/20 text-primary font-semibold">
              {getInitials(user?.email, user?.user_metadata?.full_name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {user?.user_metadata?.full_name || user?.email?.split('@')[0]}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {user?.email}
            </p>
          </div>
        </div>
        <Button
          onClick={signOut}
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
}
