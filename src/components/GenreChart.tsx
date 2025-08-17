import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { calculateGenreStatistics, getTopGenresWithOthers, GenreCount } from '@/utils/statisticsUtils';
import { createLogger } from '@/utils/loggingUtils';
import type { Book } from '@/types/models/Book';

const COLORS = [
  '#8884d8', '#83a6ed', '#8dd1e1', '#82ca9d', '#a4de6c',
  '#d0ed57', '#ffc658', '#ff8042', '#ff6361', '#bc5090',
];

interface GenreChartProps {
  /** Books to analyze for the chart */
  books: Book[];
  /** Optional chart title */
  title?: string;
  /** Chart height */
  height?: number;
  /** Maximum number of genres to display individually (remainder grouped as "Other") */
  topGenres?: number;
}

/**
 * Displays a pie chart of book genres, counting each genre individually
 * Books with multiple genres will be counted once for each genre
 */
export const GenreChart: React.FC<GenreChartProps> = ({
  books,
  title = 'Books by Genre',
  height = 300,
  topGenres = 10
}) => {
  const log = createLogger('GenreChart');
  
  const chartData = useMemo(() => {
    log.debug(`Generating genre chart data for ${books.length} books`);
    const allGenres = calculateGenreStatistics(books);
    return getTopGenresWithOthers(allGenres, topGenres);
  }, [books, topGenres, log]);
  
  // Stats text moved to InsightsView
  const totalBooksRepresented = useMemo(() => {
    return chartData.reduce((sum, genre) => sum + genre.value, 0);
  }, [chartData]);
  
  if (books.length === 0) {
    return (
      <div className="w-full">
        <div className="flex items-center mb-2">
          <h3 className="text-lg font-medium">{title}</h3>
        </div>
        <div className="flex justify-center items-center h-[200px] border rounded-md bg-muted/10">
          <p className="text-muted-foreground">No books to display</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="w-full">
      <div className="flex items-center mb-2">
        <h3 className="text-lg font-medium">{title}</h3>
      </div>
      
      {/* Stats text moved to InsightsView */}
      
      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              outerRadius={80}
              dataKey="value"
              nameKey="name"
              label={({ name, value }) => `${name}: ${value}`}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${entry.name}`} 
                  fill={entry.name === 'Other' ? '#718096' : COLORS[index % COLORS.length]} 
                />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number) => [`${value} ${value === 1 ? 'book' : 'books'}`, 'Count']}
            />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex justify-center items-center h-[200px] border rounded-md bg-muted/10">
          <p className="text-muted-foreground">No genre data available</p>
        </div>
      )}
    </div>
  );
};
