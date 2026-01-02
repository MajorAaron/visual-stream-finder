import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { BottomTabBar } from './BottomTabBar';
import { useIsMobile } from '@/hooks/use-mobile';

export function AppLayout() {
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop: Fixed Sidebar */}
      {!isMobile && <Sidebar />}

      {/* Main Content Area */}
      <main
        className={`min-h-screen ${
          isMobile ? 'pb-20' : 'ml-64'
        } transition-all duration-200`}
      >
        <div className="h-full">
          <Outlet />
        </div>
      </main>

      {/* Mobile: Bottom Tab Bar */}
      {isMobile && <BottomTabBar />}
    </div>
  );
}
