import React, { useState, useMemo } from 'react';
import { usePalette } from '@/contexts/PaletteContext';
import { InfoTooltip } from '@/components/InfoTooltip';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { Book } from '@/types/book';
import { Book as ModelBook, ReadingStatus } from '@/types/models/Book';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { BarChart2, Calendar, BookOpen, LayoutGrid, FileText, Filter, Library } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SeriesInsights } from '@/components/insights/SeriesInsights';
import { GenreChart } from '@/components/GenreChart';
import { createLogger } from '@/utils/loggingUtils';

// Create a logger for the InsightsView component
const log = createLogger('InsightsView');

const COLORS = ['#ff9f7f', '#7fd4ff', '#a992ff', '#ffcd7f', '#7fffb7', '#ff7fb4', '#7f7fff'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Maps a Book from the app type to the ModelBook type expected by GenreChart
 */
const mapToModelBook = (book: Book): ModelBook => {
  return {
    ...book,
    // Map status values to ReadingStatus enum
    status: book.status === 'reading' ? ReadingStatus.READING :
            book.status === 'completed' ? ReadingStatus.COMPLETED :
            book.status === 'want-to-read' ? ReadingStatus.TO_READ : undefined,
  } as ModelBook;
};

interface InsightsViewProps {
  books: Book[];
  onBookClick?: (book: Book) => void;
}

export const InsightsView: React.FC<InsightsViewProps> = ({ books, onBookClick }) => {
  // Get the selected palette for theme colors
  const { selectedPalette } = usePalette();
  // Tabs for switching between different insight sections
  const [activeTab, setActiveTab] = useState<'reading' | 'series'>('reading');
  // Get all available years from book completion dates
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    
    books.forEach(book => {
      if (book.completedDate) {
        const year = new Date(book.completedDate).getFullYear();
        years.add(year);
      }
      if (book.addedDate) {
        const year = new Date(book.addedDate).getFullYear();
        years.add(year);
      }
    });
    
    return Array.from(years).sort((a, b) => b - a); // Sort descending (most recent first)
  }, [books]);
  
  // State for selected year (default to current year or most recent if no current year data)
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(
    availableYears.includes(currentYear) ? currentYear : 
    availableYears.length > 0 ? availableYears[0] : 
    currentYear
  );
  
  // Filtering states for the book list
  const [genreFilter, setGenreFilter] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<number>(-1); // -1 means all months
  const [ratingFilter, setRatingFilter] = useState<number>(-1); // -1 means all ratings

  // Filter books completed in the selected year
  const completedBooksInYear = useMemo(() => {
    return books.filter(book => 
      book.completedDate && 
      new Date(book.completedDate).getFullYear() === selectedYear
    );
  }, [books, selectedYear]);
  
  // Get available genres from the books completed in the selected year
  const availableGenres = useMemo(() => {
    log.debug('Calculating available genres for year', { year: selectedYear });
    const genres = new Set<string>();
    completedBooksInYear.forEach(book => {
      if (book.genre) {
        if (Array.isArray(book.genre)) {
          // Add each genre in the array to the set
          book.genre.forEach(g => genres.add(g));
        } else {
          genres.add(book.genre);
        }
      }
    });
    const result = Array.from(genres).sort();
    log.debug('Found genres for selected year', { 
      year: selectedYear, 
      count: result.length, 
      genres: result 
    });
    return result;
  }, [completedBooksInYear, selectedYear]);
  
  // Apply filters to the books
  const filteredBooks = useMemo(() => {
    log.debug('Applying filters to books', { 
      genreFilter, 
      monthFilter, 
      ratingFilter, 
      totalBooks: completedBooksInYear.length 
    });
    
    const result = completedBooksInYear.filter(book => {
      // Genre filter
      if (genreFilter !== 'all') {
        if (Array.isArray(book.genre)) {
          if (!book.genre.includes(genreFilter)) {
            return false;
          }
        } else if (book.genre !== genreFilter) {
          return false;
        }
      }
      
      // Month filter
      if (monthFilter !== -1 && new Date(book.completedDate!).getMonth() !== monthFilter) {
        return false;
      }
      
      // Rating filter
      if (ratingFilter !== -1 && book.rating !== ratingFilter) {
        return false;
      }
      
      return true;
    });
    
    log.debug('Books after filtering', { 
      originalCount: completedBooksInYear.length, 
      filteredCount: result.length 
    });
    
    return result;
  }, [completedBooksInYear, genreFilter, monthFilter, ratingFilter]);

  // Books read per month chart data
  const booksPerMonth = useMemo(() => {
    const monthData = MONTHS.map(month => ({ name: month, books: 0 }));
    
    completedBooksInYear.forEach(book => {
      const month = new Date(book.completedDate!).getMonth();
      monthData[month].books += 1;
    });
    
    return monthData;
  }, [completedBooksInYear]);

  // Pages read per month chart data
  const pagesPerMonth = useMemo(() => {
    const monthData = MONTHS.map(month => ({ name: month, pages: 0 }));
    
    completedBooksInYear.forEach(book => {
      if (book.pageCount) {
        const month = new Date(book.completedDate!).getMonth();
        monthData[month].pages += book.pageCount;
      }
    });
    
    return monthData;
  }, [completedBooksInYear]);

  // Most read genres chart data
  const genreData = useMemo(() => {
    log.debug('Calculating most read genres chart data', { year: selectedYear });
    
    const genreCounts: Record<string, number> = {};
    
    completedBooksInYear.forEach(book => {
      if (!book.genre) {
        genreCounts['Uncategorized'] = (genreCounts['Uncategorized'] || 0) + 1;
      } else if (Array.isArray(book.genre)) {
        // Count each genre in the array
        book.genre.forEach(g => {
          genreCounts[g] = (genreCounts[g] || 0) + 1;
        });
      } else {
        genreCounts[book.genre] = (genreCounts[book.genre] || 0) + 1;
      }
    });
    
    log.trace('Raw genre counts', { genreCounts });
    
    // Convert to array and sort by count
    const result = Object.entries(genreCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // Top 5 genres
      
    log.debug('Top genres calculated', { 
      year: selectedYear, 
      topGenres: result.map(g => g.name),
      counts: result.map(g => g.value)
    });
    
    return result;
  }, [completedBooksInYear, selectedYear]);

  // Ratings distribution chart data
  const ratingsData = useMemo(() => {
    const ratings = [0, 0, 0, 0, 0]; // For ratings 1-5
    
    completedBooksInYear.forEach(book => {
      if (book.rating && book.rating >= 1 && book.rating <= 5) {
        ratings[book.rating - 1] += 1;
      }
    });
    
    return [1, 2, 3, 4, 5].map((rating, index) => ({
      name: `${rating} ★`,
      books: ratings[index]
    }));
  }, [completedBooksInYear]);

  // Calculate reading stats
  const readingStats = useMemo(() => {
    const totalBooks = completedBooksInYear.length;
    const totalPages = completedBooksInYear.reduce((sum, book) => sum + (book.pageCount || 0), 0);
    const avgRating = completedBooksInYear.length > 0 
      ? completedBooksInYear.reduce((sum, book) => sum + (book.rating || 0), 0) / completedBooksInYear.length
      : 0;
    
    return {
      totalBooks,
      totalPages,
      avgRating: avgRating.toFixed(1)
    };
  }, [completedBooksInYear]);

  if (books.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <h3 className="text-xl font-serif text-muted-foreground mb-2">No books in your library</h3>
        <p className="text-muted-foreground">Add some books to see reading insights</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs for switching between insights sections */}
      <div className="flex border-b">
        <button
          className={cn(
            "px-4 py-2 font-medium text-sm border-b-2 transition-colors",
            activeTab === 'reading' 
              ? "border-primary text-primary" 
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground"
          )}
          onClick={() => setActiveTab('reading')}
        >
          <div className="flex items-center gap-1">
            <BookOpen className="h-4 w-4" />
            Reading Stats
          </div>
        </button>
        <button
          className={cn(
            "px-4 py-2 font-medium text-sm border-b-2 transition-colors",
            activeTab === 'series' 
              ? "border-primary text-primary" 
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground"
          )}
          onClick={() => setActiveTab('series')}
        >
          <div className="flex items-center gap-1">
            <Library className="h-4 w-4" />
            Series Stats
          </div>
        </button>
      </div>
      
      {/* Series Insights */}
      {activeTab === 'series' && (
        <SeriesInsights books={books} />
      )}
      
      {/* Reading Stats */}
      {activeTab === 'reading' && (
        <div>
          {/* Year selector and stats summary */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            <div>
              <h2 className="text-2xl font-serif font-medium mb-1">Reading Insights</h2>
              <p className="text-muted-foreground">Analyze your reading habits and preferences</p>
            </div>
            
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <Card className="bg-card shadow-elegant">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-serif font-bold text-primary">{readingStats.totalBooks}</div>
                  <div className="text-sm text-muted-foreground">Books Read</div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card shadow-elegant">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-serif font-bold text-accent-warm">{readingStats.totalPages}</div>
                  <div className="text-sm text-muted-foreground">Pages Read</div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card shadow-elegant">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-serif font-bold text-accent-cool">{readingStats.avgRating} <span className="text-lg">★</span></div>
                  <div className="text-sm text-muted-foreground">Average Rating</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Books read per month */}
            <Card className="bg-card shadow-elegant">
              <CardHeader>
                <CardTitle className="text-lg font-serif">Books Read per Month</CardTitle>
                <CardDescription>Monthly reading completion in {selectedYear}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={booksPerMonth}
                      margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: 12 }}
                        angle={window.innerWidth < 500 ? -45 : 0}
                        textAnchor={window.innerWidth < 500 ? "end" : "middle"}
                        height={window.innerWidth < 500 ? 60 : 30}
                      />
                      <YAxis 
                        allowDecimals={false} 
                        tick={{ fontSize: 12 }}
                        width={35}
                      />
                      <Tooltip 
                        formatter={(value) => [`${value} books`, 'Completed']}
                        contentStyle={{ 
                          backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                          borderRadius: '6px',
                          padding: '8px',
                          fontSize: '12px'
                        }}
                      />
                      <Legend 
                        wrapperStyle={{ paddingTop: '15px', fontSize: '12px' }}
                      />
                      <Bar dataKey="books" fill="#ff9f7f" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Pages read per month */}
            <Card className="bg-card shadow-elegant">
              <CardHeader>
                <CardTitle className="text-lg font-serif">Pages Read per Month</CardTitle>
                <CardDescription>Monthly page count in {selectedYear}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={pagesPerMonth}
                      margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: 12 }}
                        angle={window.innerWidth < 500 ? -45 : 0}
                        textAnchor={window.innerWidth < 500 ? "end" : "middle"}
                        height={window.innerWidth < 500 ? 60 : 30}
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }} 
                        width={35}
                        tickFormatter={(value) => value >= 1000 ? `${(value/1000).toFixed(1)}k` : value}
                      />
                      <Tooltip 
                        formatter={(value) => [`${value} pages`, 'Read']}
                        labelFormatter={(label) => `Month: ${label}`}
                        contentStyle={{ 
                          backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                          borderRadius: '6px',
                          padding: '8px',
                          fontSize: '12px'
                        }}
                      />
                      <Legend 
                        wrapperStyle={{ paddingTop: '15px', fontSize: '12px' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="pages" 
                        stroke="#7fd4ff" 
                        strokeWidth={2}
                        dot={{ fill: '#7fd4ff', strokeWidth: 2 }}
                        activeDot={{ r: 6, stroke: '#7fd4ff', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Most read genres - using GenreChart component */}
            <Card className="bg-card shadow-elegant">
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="text-lg font-serif">Most Read Genres</CardTitle>
                  <CardDescription>Top genres read in {selectedYear}</CardDescription>
                </div>
                <InfoTooltip 
                  content={
                    <div>
                      <p>Books are counted once for each genre they belong to.</p>
                      <p className="mt-1">For example, a book categorized as both "Fiction" and "Fantasy" will count as 1 book in each category.</p>
                    </div>
                  } 
                />
              </CardHeader>
              <CardContent>
                <div className="h-80 flex items-center justify-center">
                  {completedBooksInYear.length > 0 ? (
                    <GenreChart 
                      books={completedBooksInYear.map(mapToModelBook)}
                      title=""
                      height={260}
                      topGenres={8}
                    />
                  ) : (
                    <p className="text-muted-foreground text-center">No genre data available for {selectedYear}</p>
                  )}
                </div>
                {completedBooksInYear.length > 0 && (
                  <p className="text-xs text-muted-foreground text-center mt-2 pb-2">
                    {completedBooksInYear.length === 1 ? "1 book" : `${completedBooksInYear.length} books`} with genre data.
                    {completedBooksInYear.length > 8 && " Only top 8 genres shown individually."}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Rating distribution */}
            <Card className="bg-card shadow-elegant">
              <CardHeader>
                <CardTitle className="text-lg font-serif">Rating Distribution</CardTitle>
                <CardDescription>How you rated books in {selectedYear}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={ratingsData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis 
                        allowDecimals={false} 
                        tick={{ fontSize: 12 }}
                        width={35}
                      />
                      <Tooltip
                        formatter={(value) => [`${value} books`, 'Rated']}
                        contentStyle={{ 
                          backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                          borderRadius: '6px',
                          padding: '8px',
                          fontSize: '12px'
                        }}
                      />
                      <Legend 
                        wrapperStyle={{ paddingTop: '15px', fontSize: '12px' }}
                      />
                      <Bar dataKey="books" radius={[4, 4, 0, 0]}>
                        {ratingsData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={`hsl(${index * 10 + 25}, 70%, 60%)`} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Books Read This Year List */}
          <Card className="mt-6 bg-card shadow-elegant">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-serif">Books Read in {selectedYear}</CardTitle>
                <CardDescription>Completed reading list for the year</CardDescription>
              </div>
              <div className="text-sm text-muted-foreground">{filteredBooks.length} of {completedBooksInYear.length} Books</div>
            </CardHeader>
            
            {/* Filter Controls */}
            <div className="px-6 pb-2 border-b">
              <div className="flex items-center gap-2 mb-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-medium">Filter Books</h4>
              </div>
              
              <div className="flex flex-wrap gap-3 mb-4">
                {/* Genre Filter */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground">Genre</label>
                  <select
                    className="h-8 w-[140px] rounded-md border border-input bg-background px-2 text-xs"
                    value={genreFilter}
                    onChange={(e) => {
                      const newFilter = e.target.value;
                      log.info('Genre filter changed', { from: genreFilter, to: newFilter });
                      setGenreFilter(newFilter);
                    }}
                  >
                    <option value="all">All Genres</option>
                    {availableGenres.map((genre) => (
                      <option key={genre} value={genre}>{genre}</option>
                    ))}
                  </select>
                </div>
                
                {/* Month Filter */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground">Month</label>
                  <select
                    className="h-8 w-[140px] rounded-md border border-input bg-background px-2 text-xs"
                    value={monthFilter}
                    onChange={(e) => setMonthFilter(Number(e.target.value))}
                  >
                    <option value="-1">All Months</option>
                    {MONTHS.map((month, index) => (
                      <option key={month} value={index}>{month}</option>
                    ))}
                  </select>
                </div>
                
                {/* Rating Filter */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground">Rating</label>
                  <select
                    className="h-8 w-[140px] rounded-md border border-input bg-background px-2 text-xs"
                    value={ratingFilter}
                    onChange={(e) => setRatingFilter(Number(e.target.value))}
                  >
                    <option value="-1">All Ratings</option>
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <option key={rating} value={rating}>{rating} {rating === 1 ? "Star" : "Stars"}</option>
                    ))}
                  </select>
                </div>
                
                {/* Clear Filters Button */}
                {(genreFilter !== 'all' || monthFilter !== -1 || ratingFilter !== -1) && (
                  <button 
                    className="text-xs text-primary hover:text-primary/80 underline self-end mb-1"
                    onClick={() => {
                      setGenreFilter('all');
                      setMonthFilter(-1);
                      setRatingFilter(-1);
                    }}
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>
            
            <CardContent>
              {completedBooksInYear.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No books were completed in {selectedYear}.
                </p>
              ) : filteredBooks.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-2">No books match the selected filters.</p>
                  <button 
                    className="text-xs text-primary hover:text-primary/80 underline"
                    onClick={() => {
                      setGenreFilter('all');
                      setMonthFilter(-1);
                      setRatingFilter(-1);
                    }}
                  >
                    Clear Filters
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Sort books by completion date */}
                  {[...filteredBooks]
                    .sort((a, b) => new Date(a.completedDate!).getTime() - new Date(b.completedDate!).getTime())
                    .map(book => (
                      <div 
  key={book.id} 
  className={cn(
    "flex flex-col sm:flex-row gap-4 border-b pb-4 last:border-0",
    onBookClick ? "cursor-pointer hover:bg-accent/10 rounded transition-colors" : ""
  )}
  onClick={() => onBookClick?.(book)}
  role={onBookClick ? "button" : undefined}
  tabIndex={onBookClick ? 0 : undefined}
  onKeyDown={(e) => {
    if (onBookClick && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onBookClick(book);
    }
  }}
  aria-label={onBookClick ? `View details for ${book.title}` : undefined}
>
                        <div className="flex-shrink-0 w-16 h-24">
                          {book.thumbnail ? (
                            <img 
                              src={book.thumbnail} 
                              alt={book.title} 
                              className="w-full h-full object-cover rounded"
                            />
                          ) : (
                            <div 
                              className="w-full h-full flex items-center justify-center rounded" 
                              style={{ backgroundColor: selectedPalette?.colors?.[0] || '#6366f1' }}
                            >
                              <span className="text-xs text-white text-center px-2"></span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1">
                          <h4 className="font-serif font-medium text-base mb-1">{book.title}</h4>
                          <p className="text-sm text-muted-foreground">by {book.author}</p>
                          
                          <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2">
                            <div className="text-xs">
                              <span className="text-muted-foreground">Completed:</span>{' '}
                              {new Date(book.completedDate!).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </div>
                            
                            {book.pageCount && (
                              <div className="text-xs">
                                <span className="text-muted-foreground">Pages:</span> {book.pageCount}
                              </div>
                            )}
                            
                            {book.genre && (
                              <div className="text-xs">
                                <span className="text-muted-foreground">Genre:</span>{' '}
                                {Array.isArray(book.genre) ? book.genre.join(' / ') : book.genre}
                              </div>
                            )}
                            
                            {book.rating && (
                              <div className="flex items-center text-xs">
                                <span className="text-muted-foreground mr-1">Rating:</span>
                                <div className="flex">
                                  {Array(book.rating).fill(0).map((_, i) => (
                                    <span key={i} className="text-accent-warm">★</span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default InsightsView;
