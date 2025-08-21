import { useState } from 'react';
import { ImageUpload } from '@/components/ImageUpload';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ResultsDisplay } from '@/components/ResultsDisplay';
import { AIAnalysisService } from '@/utils/aiAnalysis';
import { Card } from '@/components/ui/card';
import { Sparkles, Tv, Smartphone } from 'lucide-react';

type AppState = 'upload' | 'analyzing' | 'results';
type AnalysisStage = 'analyzing' | 'identifying' | 'searching' | 'complete';

interface DetectedContent {
  title: string;
  year: number;
  type: 'movie' | 'tv' | 'documentary';
  genre: string[];
  rating: number;
  runtime?: string;
  plot: string;
  poster: string;
  streamingSources: any[];
  confidence: number;
}

const Index = () => {
  const [appState, setAppState] = useState<AppState>('upload');
  const [analysisStage, setAnalysisStage] = useState<AnalysisStage>('analyzing');
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<DetectedContent[]>([]);

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

  const handleNewSearch = () => {
    setAppState('upload');
    setProgress(0);
    setResults([]);
  };

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="container mx-auto max-w-4xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            AI Watchlist
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Upload any image of a TV screen or movie search and instantly discover where to watch it
          </p>
        </div>

        {/* How it works */}
        {appState === 'upload' && (
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Card className="p-6 text-center">
              <Smartphone className="w-8 h-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold mb-2">1. Upload Image</h3>
              <p className="text-sm text-muted-foreground">
                Take a photo of your TV or screenshot from your phone
              </p>
            </Card>
            <Card className="p-6 text-center">
              <Sparkles className="w-8 h-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold mb-2">2. AI Analysis</h3>
              <p className="text-sm text-muted-foreground">
                Our AI identifies movies and shows in your image
              </p>
            </Card>
            <Card className="p-6 text-center">
              <Tv className="w-8 h-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold mb-2">3. Find Streams</h3>
              <p className="text-sm text-muted-foreground">
                Get direct links to watch on all platforms
              </p>
            </Card>
          </div>
        )}

        {/* Main Content */}
        <div className="space-y-6">
          {appState === 'upload' && (
            <ImageUpload onImageUpload={handleImageUpload} />
          )}

          {appState === 'analyzing' && (
            <LoadingScreen progress={progress} stage={analysisStage} />
          )}

          {appState === 'results' && (
            <ResultsDisplay results={results} onNewSearch={handleNewSearch} />
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>Powered by advanced AI image recognition and real-time streaming data</p>
        </div>
      </div>
    </div>
  );
};

export default Index;