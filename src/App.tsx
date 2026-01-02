import { useEffect } from "react";
import { HashRouter as Router, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { DevIndicator } from "@/components/DevIndicator";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { registerServiceWorker } from "@/utils/serviceWorkerRegistration";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import Watchlist from "./pages/Watchlist";
import Watched from "./pages/Watched";
import Favorites from "./pages/Favorites";
import NotFound from "./pages/NotFound";
import "./App.css";

const queryClient = new QueryClient();

function App() {
  useEffect(() => {
    // Register service worker on app load
    registerServiceWorker();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          {/* Public route */}
          <Route path="/auth" element={<Auth />} />
          
          {/* Protected routes with AppLayout */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Watchlist />} />
              <Route path="/search" element={<Index />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/watchlist" element={<Watchlist />} />
              <Route path="/watched" element={<Watched />} />
              <Route path="/favorites" element={<Favorites />} />
            </Route>
          </Route>
          
          <Route path="*" element={<NotFound />} />
        </Routes>
        <DevIndicator />
        <PWAInstallPrompt />
      </Router>
    </QueryClientProvider>
  );
}

export default App;
