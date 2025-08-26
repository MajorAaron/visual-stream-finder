import { useEffect } from "react";
import { HashRouter as Router, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DevIndicator } from "@/components/DevIndicator";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { FloatingAddButton } from "@/components/FloatingAddButton";
import { registerServiceWorker } from "@/utils/serviceWorkerRegistration";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import Watchlist from "./pages/Watchlist";
import Watched from "./pages/Watched";
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
          
          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Index />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/watchlist" element={<Watchlist />} />
            <Route path="/watched" element={<Watched />} />
          </Route>
          
          <Route path="*" element={<NotFound />} />
        </Routes>
        <DevIndicator />
        <PWAInstallPrompt />
        <FloatingAddButton />
      </Router>
    </QueryClientProvider>
  );
}

export default App;
