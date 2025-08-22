import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Star, Clock, Calendar, ArrowLeft, Trash2 } from 'lucide-react';
import { useWatchlist } from '@/hooks/useWatchlist';
import { useAuth } from '@/hooks/useAuth';

const typeColors = {
  movie: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  tv: "bg-green-500/20 text-green-400 border-green-500/30",
  documentary: "bg-purple-500/20 text-purple-400 border-purple-500/30"
};

const sourceTypeColors = {
  subscription: "bg-green-500/20 text-green-400 border-green-500/30",
  rent: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  buy: "bg-red-500/20 text-red-400 border-red-500/30",
  free: "bg-blue-500/20 text-blue-400 border-blue-500/30"
};

export default function Watchlist() {
  const { user, signOut } = useAuth();
  const { watchlist, loading, removeFromWatchlist } = useWatchlist();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Search
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-primary">My Watchlist</h1>
              <p className="text-sm text-muted-foreground">
                {watchlist.length} saved items
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <p className="text-sm text-muted-foreground">
              {user?.user_metadata?.full_name || user?.email}
            </p>
            <Button onClick={signOut} variant="outline" size="sm">
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="container mx-auto px-4 py-8">
        {watchlist.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Star className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Your watchlist is empty</h2>
            <p className="text-muted-foreground mb-6">
              Start discovering movies and TV shows to build your personal watchlist
            </p>
            <Link to="/">
              <Button>
                Start Analyzing Images
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {watchlist.map((item) => (
              <Card key={item.id} className="overflow-hidden">
                <div className="aspect-[2/3] overflow-hidden">
                  <img
                    src={item.poster || "https://images.unsplash.com/photo-1489599904821-6ef46474ebc3?w=300&h=450&fit=crop"}
                    alt={`${item.title} poster`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-lg line-clamp-2">{item.title}</h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {item.year}
                          </div>
                          {item.runtime && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {item.runtime}
                            </div>
                          )}
                          {item.rating && (
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              {item.rating}/10
                            </div>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className={typeColors[item.type]}>
                        {item.type.toUpperCase()}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {item.genre?.map((g) => (
                        <Badge key={g} variant="secondary" className="text-xs">
                          {g}
                        </Badge>
                      ))}
                    </div>

                    {item.plot && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{item.plot}</p>
                    )}

                    {/* Streaming Sources */}
                    <div>
                      {item.streaming_sources && item.streaming_sources.length > 0 ? (
                        <>
                          <h4 className="font-semibold text-sm mb-2">Available on:</h4>
                          <div className="grid grid-cols-2 gap-2">
                            {item.streaming_sources?.slice(0, 4).map((source: any, index: number) => (
                              <Button
                                key={index}
                                variant="outline"
                                size="sm"
                                className="h-auto p-2 justify-start"
                                onClick={() => window.open(source.url, '_blank')}
                              >
                                <div className="flex items-center gap-2 w-full">
                                  <img
                                    src={source.logo}
                                    alt={source.name}
                                    className="w-5 h-5 rounded"
                                  />
                                  <div className="flex-1 text-left min-w-0">
                                    <div className="font-medium text-xs truncate">{source.name}</div>
                                    <Badge 
                                      variant="outline" 
                                      className={`text-xs h-4 ${sourceTypeColors[source.type as keyof typeof sourceTypeColors]}`}
                                    >
                                      {source.type}
                                    </Badge>
                                  </div>
                                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                </div>
                              </Button>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-3 border border-dashed rounded-lg">
                          <p className="text-xs text-muted-foreground mb-1">No streaming sources found</p>
                          <p className="text-xs text-muted-foreground">
                            Release Date: {item.year}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Remove button */}
                    <Button
                      onClick={() => removeFromWatchlist(item.title, item.year)}
                      variant="outline"
                      size="sm"
                      className="w-full text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remove from Watchlist
                    </Button>

                    {item.confidence && (
                      <div className="text-xs text-muted-foreground">
                        Confidence: {Math.round(item.confidence * 100)}%
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}