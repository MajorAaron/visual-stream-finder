import { useState, useEffect, useCallback } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/SearchInput';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ResultsDisplay } from '@/components/ResultsDisplay';
import { AIAnalysisService } from '@/utils/aiAnalysis';
import { useAuth } from '@/hooks/useAuth';
import { useShareHandler } from '@/hooks/useShareHandler';
import { Card } from '@/components/ui/card';
import { Sparkles, Tv, Smartphone, Menu, X } from 'lucide-react';

type AppState = 'upload' | 'analyzing' | 'results';
type AnalysisStage = 'analyzing' | 'identifying' | 'searching' | 'complete';

interface DetectedContent {
  title: string;
  year: number;
  type: 'movie' | 'tv' | 'documentary' | 'youtube';
  genre: string[];
  rating: number;
  runtime?: string;
  plot: string;
  poster: string;
  streamingSources: any[];
  confidence: number;
  releaseDate?: string;
  youtubeUrl?: string;
  channelName?: string;
}

const Index = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { sharedContent, clearSharedContent } = useShareHandler();
  const [appState, setAppState] = useState<AppState>('upload');
  const [analysisStage, setAnalysisStage] = useState<AnalysisStage>('analyzing');
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<DetectedContent[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleImageUpload = useCallback(async (file: File) => {
    setAppState('analyzing');
    setProgress(0);
    setAnalysisStage('analyzing');

    // Simulate analysis stages
    const stages: AnalysisStage[] = ['analyzing', 'identifying', 'searching', 'complete'];
    
    for (let i = 0; i < stages.length; i++) {
      setAnalysisStage(stages[i]);
      
      // Animate progress for each stage
      const stageProgress = (i + 1) * 25;
      const startProgress = i * 25;
      
      for (let p = startProgress; p <= stageProgress; p += 2) {
        setProgress(p);
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      if (i < stages.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    try {
      const analysisResults = await AIAnalysisService.analyzeImage(file);
      setResults(analysisResults);
      setProgress(100);
      setAppState('results');
    } catch (error) {
      console.error('Analysis failed:', error);
      setAppState('upload');
    }
  }, []);

  const handleTextSearch = useCallback(async (query: string) => {
    setAppState('analyzing');
    setProgress(0);
    setAnalysisStage('searching');

    // Simulate search stages for text
    const stages: AnalysisStage[] = ['searching', 'complete'];
    
    for (let i = 0; i < stages.length; i++) {
      setAnalysisStage(stages[i]);
      
      // Animate progress for each stage
      const stageProgress = (i + 1) * 50;
      const startProgress = i * 50;
      
      for (let p = startProgress; p <= stageProgress; p += 4) {
        setProgress(p);
        await new Promise(resolve => setTimeout(resolve, 30));
      }
      
      if (i < stages.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    try {
      const searchResults = await AIAnalysisService.searchByText(query);
      setResults(searchResults);
      setProgress(100);
      setAppState('results');
    } catch (error) {
      console.error('Search failed:', error);
      setAppState('upload');
    }
  }, []);

  const handleNewSearch = () => {
    setAppState('upload');
    setProgress(0);
    setResults([]);
  };

  // Handle shared content when it arrives
  useEffect(() => {
    if (sharedContent) {
      if (sharedContent.type === 'image' && sharedContent.imageBase64) {
        // Convert base64 to File object for image analysis
        const byteCharacters = atob(sharedContent.imageBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: sharedContent.mimeType || 'image/jpeg' });
        const file = new File([blob], 'shared-image.jpg', { type: sharedContent.mimeType || 'image/jpeg' });
        
        // Process the shared image
        handleImageUpload(file);
        clearSharedContent();
      } else if (sharedContent.type === 'text' || sharedContent.type === 'url') {
        // Process shared text/URL
        const searchQuery = sharedContent.url || sharedContent.text || '';
        if (searchQuery) {
          handleTextSearch(searchQuery);
          clearSharedContent();
        }
      }
    }
  }, [sharedContent, clearSharedContent, handleImageUpload, handleTextSearch]);

  // Auth is now handled by ProtectedRoute wrapper
  if (!user) {
    return null; // This shouldn't happen as ProtectedRoute handles it
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      {/* Header with user info and sign out */}
      <header className="border-b bg-background/80 backdrop-blur-sm relative">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex-1 flex items-center gap-2">
              <Button onClick={() => navigate('/watchlist')} variant="outline" size="sm">
                My Watchlist
              </Button>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-primary">AI Watchlist</h1>
                <p className="text-sm text-muted-foreground hidden sm:block">
                  Welcome back, {user.user_metadata?.full_name || user.email}!
                </p>
              </div>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden sm:flex items-center gap-2 sm:gap-4">
              <Button onClick={() => navigate('/profile')} variant="outline" size="sm">
                Profile
              </Button>
              <Button onClick={() => navigate('/watchlist')} variant="outline" size="sm">
                My Watchlist
              </Button>
              <Button onClick={() => navigate('/watched')} variant="outline" size="sm">
                Watched
              </Button>
              <Button onClick={signOut} variant="outline" size="sm">
                Sign Out
              </Button>
            </div>
            
            {/* Mobile Hamburger Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="sm:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
          
          {/* Mobile Menu Dropdown */}
          {isMobileMenuOpen && (
            <div className="sm:hidden absolute top-full left-0 right-0 bg-background border-b shadow-lg z-50">
              <div className="px-4 py-2 border-b">
                <p className="text-sm text-muted-foreground">
                  {user.user_metadata?.full_name || user.email}
                </p>
              </div>
              <div className="flex flex-col p-2">
                <Button 
                  onClick={() => {
                    navigate('/profile');
                    setIsMobileMenuOpen(false);
                  }} 
                  variant="ghost" 
                  className="justify-start"
                >
                  Profile
                </Button>
                <Button 
                  onClick={() => {
                    navigate('/watchlist');
                    setIsMobileMenuOpen(false);
                  }} 
                  variant="ghost" 
                  className="justify-start"
                >
                  My Watchlist
                </Button>
                <Button 
                  onClick={() => {
                    navigate('/watched');
                    setIsMobileMenuOpen(false);
                  }} 
                  variant="ghost" 
                  className="justify-start"
                >
                  Watched
                </Button>
                <Button 
                  onClick={() => {
                    signOut();
                    setIsMobileMenuOpen(false);
                  }} 
                  variant="ghost" 
                  className="justify-start text-destructive"
                >
                  Sign Out
                </Button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <div className="container mx-auto px-4 py-6">
        {/* Main Content */}
        <div className="space-y-6">
          {appState === 'upload' && (
            <>
              {/* Minimal title */}
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-primary">
                  Add to Watchlist
                </h2>
              </div>
              
              {/* Search Input immediately visible */}
              <SearchInput onImageUpload={handleImageUpload} onTextSearch={handleTextSearch} />
              
              {/* Optional help text below the inputs */}
              <div className="text-center mt-8">
                <p className="text-sm text-muted-foreground">
                  Upload an image or enter a title to find streaming options
                </p>
              </div>
            </>
          )}

          {appState === 'analyzing' && (
            <LoadingScreen progress={progress} stage={analysisStage} />
          )}

          {appState === 'results' && (
            <ResultsDisplay results={results} onNewSearch={handleNewSearch} />
          )}
        </div>
        
        <footer className="text-center mt-16 text-sm text-muted-foreground">
          <p>Powered by OpenAI Vision API & TMDB</p>
        </footer>
      </div>
    </div>
  );
};

export default Index;