import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Star, Calendar, Clock } from 'lucide-react';

interface StreamingSource {
  name: string;
  logo: string;
  url: string;
  type: 'subscription' | 'rent' | 'buy' | 'free';
  price?: string;
}

interface DetectedContent {
  title: string;
  year: number;
  type: 'movie' | 'tv' | 'documentary';
  genre: string[];
  rating: number;
  runtime?: string;
  plot: string;
  poster: string;
  streamingSources: StreamingSource[];
  confidence: number;
}

interface ResultsDisplayProps {
  results: DetectedContent[];
  onNewSearch: () => void;
}

const typeColors = {
  movie: 'bg-blue-500/20 text-blue-400',
  tv: 'bg-green-500/20 text-green-400',
  documentary: 'bg-purple-500/20 text-purple-400'
};

const sourceTypeColors = {
  subscription: 'bg-primary/20 text-primary',
  rent: 'bg-warning/20 text-warning',
  buy: 'bg-destructive/20 text-destructive',
  free: 'bg-success/20 text-success'
};

export const ResultsDisplay = ({ results, onNewSearch }: ResultsDisplayProps) => {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Analysis Complete!</h2>
        <p className="text-muted-foreground">
          Found {results.length} matching {results.length === 1 ? 'title' : 'titles'}
        </p>
      </div>

      <div className="grid gap-6">
        {results.map((content, index) => (
          <Card key={index} className="result-card p-6">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-shrink-0">
                <img
                  src={content.poster}
                  alt={content.title}
                  className="w-32 h-48 object-cover rounded-lg shadow-lg"
                />
              </div>

              <div className="flex-1 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <h3 className="text-xl font-bold">{content.title}</h3>
                    <Badge className={typeColors[content.type]}>
                      {content.type.toUpperCase()}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {content.year}
                    </div>
                    {content.runtime && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {content.runtime}
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      {content.rating}/10
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {content.genre.map((g) => (
                      <Badge key={g} variant="secondary">
                        {g}
                      </Badge>
                    ))}
                  </div>
                </div>

                <p className="text-sm text-muted-foreground line-clamp-3">
                  {content.plot}
                </p>

                <div className="space-y-3">
                  <h4 className="font-semibold">Available on:</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {content.streamingSources.map((source, idx) => (
                      <Button
                        key={idx}
                        variant="outline"
                        className="flex items-center justify-between p-4 h-auto"
                        asChild
                      >
                        <a href={source.url} target="_blank" rel="noopener noreferrer">
                          <div className="flex items-center gap-3">
                            <img
                              src={source.logo}
                              alt={source.name}
                              className="w-8 h-8 rounded"
                            />
                            <div className="text-left">
                              <div className="font-medium">{source.name}</div>
                              <div className="flex items-center gap-2">
                                <Badge className={sourceTypeColors[source.type]} variant="secondary">
                                  {source.type}
                                </Badge>
                                {source.price && (
                                  <span className="text-xs text-muted-foreground">
                                    {source.price}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    Confidence: {Math.round(content.confidence * 100)}%
                  </p>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="text-center">
        <Button variant="glow" onClick={onNewSearch}>
          Analyze Another Image
        </Button>
      </div>
    </div>
  );
};