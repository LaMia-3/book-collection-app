import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Book } from '@/types/book';
import { Series } from '@/types/series';
import { UpcomingBook } from '@/types/series';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { BookOpen, Library, Calendar, AlertCircle } from 'lucide-react';
import { seriesService } from '@/services/SeriesService';
import { upcomingReleasesService } from '@/services/UpcomingReleasesService';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface SeriesInsightsProps {
  books: Book[];
}

export const SeriesInsights: React.FC<SeriesInsightsProps> = ({ books }) => {
  const [series, setSeries] = useState<Series[]>([]);
  const [upcomingReleases, setUpcomingReleases] = useState<UpcomingBook[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadSeriesData = async () => {
      try {
        setLoading(true);
        // Load series from the service
        const allSeries = await seriesService.getAllSeries();
        setSeries(allSeries);

        // Load upcoming releases for next 30 days
        const upcoming = await upcomingReleasesService.getUpcomingReleasesInDays(30);
        setUpcomingReleases(upcoming);
      } catch (error) {
        console.error('Error loading series data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSeriesData();
  }, []);

  // Calculate series status statistics
  const seriesStatusStats = series.reduce((stats, s) => {
    const status = s.status || 'unknown';
    stats[status] = (stats[status] || 0) + 1;
    return stats;
  }, {} as Record<string, number>);

  // Convert to chart data
  const statusChartData = Object.entries(seriesStatusStats).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value
  }));

  // Calculate series completion
  const seriesCompletionData = series.map(s => {
    const totalBooks = s.totalBooks || 0;
    const booksInSeries = s.books?.length || 0;
    const completionPercentage = totalBooks > 0 ? Math.round((booksInSeries / totalBooks) * 100) : 0;
    
    return {
      ...s,
      completionPercentage,
      booksInSeries,
      totalBooks
    };
  });

  // Calculate top series authors
  const authorStats = series.reduce((stats, s) => {
    if (s.author) {
      stats[s.author] = (stats[s.author] || 0) + 1;
    }
    return stats;
  }, {} as Record<string, number>);

  const topAuthors = Object.entries(authorStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  const COLORS = ['#ff9f7f', '#7fd4ff', '#a992ff', '#ffcd7f', '#7fffb7'];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Series Overview Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Library className="h-5 w-5" /> Series Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-[120px] w-full" />
              <div className="flex justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-muted/50 p-3 rounded-md text-center">
                  <div className="text-3xl font-bold">{series.length}</div>
                  <div className="text-xs text-muted-foreground">Total Series</div>
                </div>
                <div className="bg-muted/50 p-3 rounded-md text-center">
                  <div className="text-3xl font-bold">
                    {series.filter(s => s.isTracked).length}
                  </div>
                  <div className="text-xs text-muted-foreground">Tracked Series</div>
                </div>
              </div>

              {series.length > 0 && (
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={2}
                        dataKey="value"
                        label
                      >
                        {statusChartData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={COLORS[index % COLORS.length]} 
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} series`, 'Count']} />
                      <Legend verticalAlign="bottom" height={30} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

              <Button 
                variant="outline" 
                size="sm" 
                className="w-full mt-2"
                onClick={() => navigate('/series')}
              >
                View All Series
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Series Completion Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="h-5 w-5" /> Series Completion
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <Skeleton className="h-2 w-full" />
                </div>
              ))}
            </div>
          ) : seriesCompletionData.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              No series in your collection yet
            </div>
          ) : (
            <div className="space-y-4 max-h-[250px] overflow-y-auto pr-2">
              {seriesCompletionData
                .sort((a, b) => b.completionPercentage - a.completionPercentage)
                .map(s => (
                  <div key={s.id} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium truncate" title={s.name}>
                        {s.name}
                      </span>
                      <span>
                        {s.booksInSeries}/{s.totalBooks}
                      </span>
                    </div>
                    <Progress value={s.completionPercentage} className="h-2" />
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <span>{s.author}</span>
                      <span>{s.completionPercentage}%</span>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Releases Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" /> Upcoming Releases
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-16 w-10 flex-shrink-0" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : upcomingReleases.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              No upcoming releases in the next 30 days
            </div>
          ) : (
            <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2">
              {upcomingReleases
                .sort((a, b) => {
                  // Sort by release date ascending (nearest first)
                  if (!a.expectedReleaseDate) return 1;
                  if (!b.expectedReleaseDate) return -1;
                  return new Date(a.expectedReleaseDate).getTime() - new Date(b.expectedReleaseDate).getTime();
                })
                .slice(0, 4)
                .map(release => (
                  <div key={release.id} className="flex gap-3">
                    {release.coverImageUrl ? (
                      <img 
                        src={release.coverImageUrl} 
                        alt={release.title} 
                        className="h-16 w-10 object-cover flex-shrink-0 rounded"
                      />
                    ) : (
                      <div className="h-16 w-10 bg-muted flex items-center justify-center flex-shrink-0 rounded">
                        <BookOpen className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1">
                      <h4 className="text-sm font-medium line-clamp-1">{release.title}</h4>
                      <p className="text-xs text-muted-foreground">{release.author}</p>
                      {release.expectedReleaseDate && (
                        <div className="flex items-center gap-1 mt-1">
                          <Badge variant="outline" className="text-[10px] py-0 h-4">
                            {new Date(release.expectedReleaseDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric'
                            })}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px] py-0 h-4">
                            {release.seriesName}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              {upcomingReleases.length > 4 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full text-xs"
                >
                  +{upcomingReleases.length - 4} more releases
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Series Authors Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5" /> Top Series Authors
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex justify-between">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-5 w-10" />
                </div>
              ))}
            </div>
          ) : topAuthors.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              No series authors found
            </div>
          ) : (
            <div className="space-y-3">
              {topAuthors.map((author, index) => (
                <div key={index} className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="font-medium">{author.name}</span>
                  </div>
                  <Badge variant="outline">{author.count} series</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SeriesInsights;
