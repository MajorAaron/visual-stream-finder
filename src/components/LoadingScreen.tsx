import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Loader2, Eye, Search, Database } from 'lucide-react';

interface LoadingScreenProps {
  progress: number;
  stage: 'analyzing' | 'identifying' | 'searching' | 'complete';
}

const stageInfo = {
  analyzing: {
    icon: Eye,
    title: 'Analyzing Image',
    description: 'Using AI to analyze your uploaded image...'
  },
  identifying: {
    icon: Search,
    title: 'Identifying Content',
    description: 'Detecting movies and shows in the image...'
  },
  searching: {
    icon: Database,
    title: 'Finding Streaming Sources',
    description: 'Searching across all streaming platforms...'
  },
  complete: {
    icon: Search,
    title: 'Complete',
    description: 'Analysis finished!'
  }
};

export const LoadingScreen = ({ progress, stage }: LoadingScreenProps) => {
  const currentStage = stageInfo[stage];
  const Icon = currentStage.icon;

  return (
    <Card className="p-8">
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
              {stage === 'complete' ? (
                <Icon className="h-10 w-10 text-primary" />
              ) : (
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
              )}
            </div>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary to-primary-glow opacity-20 animate-pulse"></div>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-semibold">{currentStage.title}</h3>
          <p className="text-muted-foreground">{currentStage.description}</p>
        </div>

        <div className="space-y-2">
          <Progress value={progress} className="w-full" />
          <p className="text-sm text-muted-foreground">{progress}% complete</p>
        </div>

        <div className="flex justify-center space-x-8 text-sm">
          {Object.entries(stageInfo).slice(0, 3).map(([key, info], index) => (
            <div
              key={key}
              className={`flex items-center space-x-2 ${
                stage === key
                  ? 'text-primary'
                  : progress > (index + 1) * 25
                  ? 'text-success'
                  : 'text-muted-foreground'
              }`}
            >
              <info.icon className="h-4 w-4" />
              <span className="capitalize">{key}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};