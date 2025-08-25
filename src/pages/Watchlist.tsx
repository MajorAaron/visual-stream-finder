import { Link, Navigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Star, Clock, Calendar, ArrowLeft, Trash2 } from 'lucide-react';
import { useWatchlist } from '@/hooks/useWatchlist';
import { useAuth } from '@/hooks/useAuth';

const typeColors = {
  movie: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  tv: "bg-green-500/20 text-green-400 border-green-500/30",
  documentary: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  youtube: "bg-red-500/20 text-red-400 border-red-500/30"
};



// Known dark logos that need light backgrounds for visibility
const darkLogos = [
  'apple tv',
  'hbo max', 
  'hbo',
  'netflix',
  'amazon prime video',
  'disney+',
  'peacock',
  'paramount+',
  'showtime',
  'starz'
];

const isDarkLogo = (serviceName: string) => {
  return darkLogos.some(darkService => 
    serviceName.toLowerCase().includes(darkService.toLowerCase())
  );
};

export default function Watchlist() {
  const { user, signOut, loading: authLoading } = useAuth();
  const { watchlist, loading, removeFromWatchlist, markAsWatched } = useWatchlist();

  // Redirect to auth page if not logged in
  if (!authLoading && !user) {
    return <Navigate to="/auth" replace />;
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
              <Link to="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Search
                </Button>
              </Link>
              <div className="min-w-0 flex-1 sm:flex-none">
                <h1 className="text-2xl sm:text-3xl font-bold text-primary">My Watchlist</h1>
                <p className="text-sm text-muted-foreground">
                  {watchlist.length} saved items
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end">
              <Link to="/watched">
                <Button variant="outline" size="sm">
                  Watched
                </Button>
              </Link>
              <p className="text-sm text-muted-foreground truncate max-w-[120px] sm:max-w-none">
                {user?.user_metadata?.full_name || user?.email}
              </p>
              <Button onClick={signOut} variant="outline" size="sm" className="flex-shrink-0">
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {watchlist.length === 0 ? (
          <div className="text-center py-12 sm:py-16 px-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Star className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold mb-2">Your watchlist is empty</h2>
            <p className="text-muted-foreground mb-6 text-sm sm:text-base">
              Start discovering movies and TV shows to build your personal watchlist
            </p>
            <Link to="/">
              <Button>
                Start Analyzing Images
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {watchlist.map((item) => (
              <Card key={item.id} className="overflow-hidden w-full shadow-lg hover:shadow-xl transition-shadow duration-200">
                <div className={`overflow-hidden ${item.type === 'youtube' ? 'aspect-video' : 'aspect-[2/3]'}`}>
                  <img
                    src={item.poster || "https://images.unsplash.com/photo-1489599904821-6ef46474ebc3?w=300&h=450&fit=crop"}
                    alt={`${item.title} poster`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <CardContent className="p-3 sm:p-4">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-lg sm:text-xl line-clamp-2 mb-2">{item.title}</h3>
                        <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-sm text-muted-foreground">
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
                      <Badge variant="outline" className={`${typeColors[item.type]} flex-shrink-0 text-xs`}>
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
                      <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">{item.plot}</p>
                    )}

                    {/* Streaming Sources / YouTube Link */}
                    <div className="space-y-3">
                      {item.type === 'youtube' ? (
                        <>
                          <h4 className="font-semibold text-sm">Watch on YouTube:</h4>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-auto p-2 justify-start w-full"
                            onClick={() => window.open((item as any).youtube_url || `https://youtube.com/search?q=${encodeURIComponent(item.title)}`, '_blank')}
                          >
                            <div className="flex items-center gap-2 w-full">
                              <div className="w-5 h-5 bg-red-500 rounded flex items-center justify-center flex-shrink-0">
                                <span className="text-white font-bold text-xs">YT</span>
                              </div>
                              <div className="flex-1 text-left min-w-0">
                                <div className="font-medium text-xs truncate">YouTube</div>
                                {(item as any).channel_name && (
                                  <div className="text-xs text-muted-foreground truncate">
                                    {(item as any).channel_name}
                                  </div>
                                )}
                              </div>
                              <ExternalLink className="w-4 h-4 flex-shrink-0" />
                            </div>
                          </Button>
                        </>
                      ) : item.streaming_sources && item.streaming_sources.length > 0 ? (
                        <>
                          <h4 className="font-semibold text-sm">Available on:</h4>
                          <div className="flex flex-col gap-2">
                            {(() => {
                              // Group streaming sources by service name
                              const groupedSources = item.streaming_sources.reduce((acc: any, source: any) => {
                                if (!acc[source.name]) {
                                  acc[source.name] = {
                                    name: source.name,
                                    logo: source.logo,
                                    url: source.url, // Use the first URL found
                                    types: []
                                  };
                                }
                                if (!acc[source.name].types.find((t: any) => t.type === source.type)) {
                                  acc[source.name].types.push({
                                    type: source.type,
                                    price: source.price
                                  });
                                }
                                return acc;
                              }, {});

                              return Object.values(groupedSources).slice(0, 4).map((service: any, index: number) => {
                                console.log(`Watchlist - ${service.name}: ${service.url}`);
                                return (
                                  <Button
                                    key={index}
                                    variant="outline"
                                    size="sm"
                                    className="h-auto p-2 justify-start"
                                    onClick={() => {
                                      console.log(`Opening ${service.name} link: ${service.url}`);
                                      window.open(service.url, '_blank');
                                    }}
                                  >
                                  <div className="flex items-center gap-2 w-full">
                                    <div className={`w-5 h-5 rounded p-0.5 flex items-center justify-center flex-shrink-0 ${
                                      isDarkLogo(service.name) ? 'bg-white' : 'bg-transparent'
                                    }`}>
                                      <img
                                        src={service.logo}
                                        alt={service.name}
                                        className="w-full h-full object-contain"
                                      />
                                    </div>
                                    <div className="flex-1 text-left min-w-0">
                                      <div className="font-medium text-xs truncate">{service.name}</div>
                                    </div>
                                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                  </div>
                                </Button>
                                );
                              });
                            })()}
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-4 border border-dashed rounded-lg">
                          <p className="text-sm text-muted-foreground mb-1">No streaming sources found</p>
                          <p className="text-sm text-muted-foreground">
                            Release Date: {item.year}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Mark as Watched button */}
                    <Button
                      onClick={() => markAsWatched(item.title, item.year)}
                      variant="outline"
                      size="sm"
                      className="w-full text-green-500 hover:text-green-600 hover:bg-green-50 h-10 sm:h-9 mb-2"
                    >
                      <Star className="w-4 h-4 mr-2" />
                      Mark as Watched
                    </Button>

                    {/* Remove button */}
                    <Button
                      onClick={() => removeFromWatchlist(item.title, item.year)}
                      variant="outline"
                      size="sm"
                      className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 h-10 sm:h-9"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remove from Watchlist
                    </Button>

                    {item.confidence && (
                      <div className="text-xs text-muted-foreground pt-2 border-t">
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