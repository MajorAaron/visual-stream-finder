import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/SearchInput';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ResultsDisplay } from '@/components/ResultsDisplay';
import { AIAnalysisService } from '@/utils/aiAnalysis';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Sparkles, Tv, Smartphone } from 'lucide-react';

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
  const [appState, setAppState] = useState<AppState>('upload');
  const [analysisStage, setAnalysisStage] = useState<AnalysisStage>('analyzing');
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<DetectedContent[]>([]);

  // Auth is now handled by ProtectedRoute wrapper
  if (!user) {
    return null; // This shouldn't happen as ProtectedRoute handles it
  }

  const handleImageUpload = async (file: File) => {
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
  };

  const handleTextSearch = async (query: string) => {
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
  };

  const handleNewSearch = () => {
    setAppState('upload');
    setProgress(0);
    setResults([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      {/* Header with user info and sign out */}
      <header className="border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-primary">AI Watchlist</h1>
              <p className="text-sm text-muted-foreground">
                Welcome back, {user.user_metadata?.full_name || user.email}!
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
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
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="container mx-auto px-4 py-8">
        {appState === 'upload' && (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-primary mb-4">
                Discover What to Watch
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Upload any image, paste a title, or share text from your phone to find movies and TV shows 
                and discover where to watch them instantly.
              </p>
            </div>

            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-8">
              <div className="text-center p-6 bg-card rounded-lg">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-primary font-bold">1</span>
                </div>
                <h3 className="font-semibold mb-2">Upload or Search</h3>
                <p className="text-sm text-muted-foreground">
                  Drop an image or enter a movie/TV show title
                </p>
              </div>
              <div className="text-center p-6 bg-card rounded-lg">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-primary font-bold">2</span>
                </div>
                <h3 className="font-semibold mb-2">AI Analysis</h3>
                <p className="text-sm text-muted-foreground">
                  AI identifies content or searches databases
                </p>
              </div>
              <div className="text-center p-6 bg-card rounded-lg">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-primary font-bold">3</span>
                </div>
                <h3 className="font-semibold mb-2">Find Streams</h3>
                <p className="text-sm text-muted-foreground">
                  Get direct links to streaming platforms
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="space-y-6">
          {appState === 'upload' && (
            <SearchInput onImageUpload={handleImageUpload} onTextSearch={handleTextSearch} />
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