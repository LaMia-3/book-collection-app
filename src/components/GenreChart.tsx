import React, { useMemo, useState, useEffect } from 'react';
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
  
  // State to track the container width for responsive sizing
  const [containerWidth, setContainerWidth] = useState(300);
  
  // Calculate outer and inner radius based on container width
  const outerRadius = useMemo(() => Math.min(containerWidth * 0.35, 80), [containerWidth]);
  const innerRadius = useMemo(() => Math.min(containerWidth * 0.15, 30), [containerWidth]);
  
  // Effect to estimate container width based on window size
  useEffect(() => {
    const updateWidth = () => {
      // Simple estimation based on window width - adjust as needed
      const estimatedWidth = Math.min(window.innerWidth * 0.8, 500);
      setContainerWidth(estimatedWidth);
    };
    
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);
  
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
          <PieChart margin={{ top: 10, right: 30, left: 30, bottom: 10 }}>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              // Use pre-calculated radius values
              outerRadius={outerRadius}
              innerRadius={innerRadius}
              dataKey="value"
              nameKey="name"
              // Smart label rendering that prevents overlap
              label={({ name, value, percent }) => {
                // Only show labels for segments that are large enough
                if (percent < 0.05) return null;
                
                // Truncate long names
                const truncatedName = name.length > 12 ? `${name.slice(0, 12)}...` : name;
                return `${truncatedName}: ${value}`;
              }}
              labelLine={{ 
                stroke: '#8884d8', 
                strokeWidth: 1,
                // Use fixed strokeDasharray - can't be dynamic with recharts typings
                strokeDasharray: "3 3"
              }}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${entry.name}`} 
                  fill={entry.name === 'Other' ? '#718096' : COLORS[index % COLORS.length]} 
                />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value, name) => [`${value} books`, name]} 
              contentStyle={{
                backgroundColor: 'white',
                borderRadius: '6px',
                padding: '8px 12px',
                fontSize: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.12)'
              }}
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
