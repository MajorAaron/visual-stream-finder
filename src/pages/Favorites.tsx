import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Star, Clock, Calendar, ArrowLeft, Trash2 } from 'lucide-react';
import { useWatchlist } from '@/hooks/useWatchlist';
import { useAuth } from '@/hooks/useAuth';
import { StreamingIcon } from '@/components/StreamingIcon';

const typeColors = {
  movie: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  tv: 'bg-green-500/20 text-green-400 border-green-500/30',
  documentary: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  youtube: 'bg-red-500/20 text-red-400 border-red-500/30',
};

export default function Favorites() {
  const { user, signOut } = useAuth();
  const { favorites, loading, removeFromWatchlist, setFavorite } = useWatchlist();

  if (loading) {
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
              <Link to="/search">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Search
                </Button>
              </Link>
              <div className="min-w-0 flex-1 sm:flex-none">
                <h1 className="text-2xl sm:text-3xl font-bold text-primary">Favorites</h1>
                <p className="text-sm text-muted-foreground">{favorites.length} favorited items</p>
              </div>
            </div>
            <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end">
              <Link to="/watchlist">
                <Button variant="outline" size="sm">
                  My Watchlist
                </Button>
              </Link>
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
        {favorites.length === 0 ? (
          <div className="text-center py-12 sm:py-16 px-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Star className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold mb-2">No favorites yet</h2>
            <p className="text-muted-foreground mb-6 text-sm sm:text-base">
              Star items you love to watch over and over
            </p>
            <Link to="/search">
              <Button>Find Titles</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-6">
            {favorites.map((item) => (
              <Card key={item.id} className="overflow-hidden w-full shadow-lg hover:shadow-xl transition-shadow duration-200">
                <div className={`overflow-hidden ${item.type === 'youtube' ? 'aspect-video' : 'aspect-[2/3]'}`}>
                  <img
                    src={item.poster || 'https://images.unsplash.com/photo-1489599904821-6ef46474ebc3?w=300&h=450&fit=crop'}
                    alt={`${item.title} poster`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <CardContent className="p-2 sm:p-4">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-base sm:text-xl line-clamp-2 mb-2">{item.title}</h3>
                        <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
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

                    {/* Streaming Sources / YouTube */}
                    <div className="hidden sm:block space-y-3">
                      {item.type === 'youtube' || (item as any).youtube_url ? (
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
                                  <div className="text-xs text-muted-foreground truncate">{(item as any).channel_name}</div>
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
                              const grouped = item.streaming_sources.reduce((acc: any, s: any) => {
                                if (!acc[s.name]) acc[s.name] = { name: s.name, url: s.url, types: [] };
                                if (!acc[s.name].types.find((t: any) => t.type === s.type)) {
                                  acc[s.name].types.push({ type: s.type, price: s.price });
                                }
                                return acc;
                              }, {});
                              return Object.values(grouped).slice(0, 4).map((service: any, index: number) => (
                                <Button
                                  key={index}
                                  variant="outline"
                                  size="sm"
                                  className="h-auto p-2 justify-start"
                                  onClick={() => window.open(service.url, '_blank')}
                                >
                                  <div className="flex items-center gap-2 w-full">
                                    <StreamingIcon
                                      serviceId={service.name.toLowerCase().replace(/[^a-z0-9]/g, '')}
                                      serviceName={service.name}
                                      className="w-5 h-5 flex-shrink-0"
                                    />
                                    <div className="flex-1 text-left min-w-0">
                                      <div className="font-medium text-xs truncate">{service.name}</div>
                                    </div>
                                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                  </div>
                                </Button>
                              ));
                            })()}
                          </div>
                        </>
                      ) : null}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setFavorite(item.title, item.year, false)}
                        variant="outline"
                        size="sm"
                        className="flex-1 h-8 text-xs"
                      >
                        <Star className="w-4 h-4 mr-1 fill-yellow-400 text-yellow-400" /> Unfavorite
                      </Button>
                      <Button
                        onClick={() => removeFromWatchlist(item.title, item.year)}
                        variant="outline"
                        size="sm"
                        className="flex-1 h-8 text-xs text-red-500 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 mr-1" /> Remove
                      </Button>
                    </div>
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
