import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom'; // Add jest-dom matchers
import { GenreChart } from '../GenreChart';
import * as statisticsUtils from '@/utils/statisticsUtils';
import type { Book } from '@/types/models/Book';
import type { GenreCount } from '@/utils/statisticsUtils';

// Mock the statistics utilities
jest.mock('@/utils/statisticsUtils', () => ({
  calculateGenreStatistics: jest.fn(),
  getTopGenresWithOthers: jest.fn()
}));

// Mock the logging utility
jest.mock('@/utils/loggingUtils', () => ({
  createLogger: () => ({
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    trace: jest.fn(),
  })
}));

// Mock the recharts components to avoid test issues with SVG rendering
jest.mock('recharts', () => ({
  PieChart: ({ children }: { children: React.ReactNode }) => <div data-testid="pie-chart">{children}</div>,
  Pie: ({ data }: { data: any[] }) => (
    <div data-testid="pie">
      {data.map(item => (
        <div key={item.name} data-testid={`pie-item-${item.name}`}>
          {item.name}: {item.value}
        </div>
      ))}
    </div>
  ),
  Cell: () => <div data-testid="cell" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="responsive-container">{children}</div>
}));

describe('GenreChart', () => {
  const mockBooks: Book[] = [
    { 
      id: '1', 
      title: 'Book 1', 
      author: 'Author 1', 
      genre: ['Fiction', 'Fantasy'],
      spineColor: 1,
      addedDate: '2023-01-01'
    },
    { 
      id: '2', 
      title: 'Book 2', 
      author: 'Author 2', 
      genre: 'Mystery',
      spineColor: 2,
      addedDate: '2023-01-02'
    }
  ];

  const mockGenreCounts: GenreCount[] = [
    { name: 'Fiction', value: 1, percentage: 33.33 },
    { name: 'Fantasy', value: 1, percentage: 33.33 },
    { name: 'Mystery', value: 1, percentage: 33.33 }
  ];

  const mockTopGenres: GenreCount[] = [
    { name: 'Fiction', value: 1, percentage: 33.33 },
    { name: 'Fantasy', value: 1, percentage: 33.33 },
    { name: 'Other', value: 1, percentage: 33.33 }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (statisticsUtils.calculateGenreStatistics as jest.Mock).mockReturnValue(mockGenreCounts);
    (statisticsUtils.getTopGenresWithOthers as jest.Mock).mockReturnValue(mockTopGenres);
  });

  it('should render the chart with provided books', () => {
    // Arrange & Act
    render(<GenreChart books={mockBooks} />);

    // Assert
    expect(statisticsUtils.calculateGenreStatistics).toHaveBeenCalledWith(mockBooks);
    expect(statisticsUtils.getTopGenresWithOthers).toHaveBeenCalled();
    
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    expect(screen.getByTestId('pie')).toBeInTheDocument();
    expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    // Legend removed from component
    
    // Check for title
    expect(screen.getByText('Books by Genre')).toBeInTheDocument();
    // Info tooltip moved to InsightsView
  });

  // Book count information test removed as this content was moved to InsightsView

  it('should show message when no books are provided', () => {
    // Arrange & Act
    render(<GenreChart books={[]} />);

    // Assert
    expect(screen.getByText('No books to display')).toBeInTheDocument();
    // The calculation is still called due to useMemo, but the chart is not rendered
  });

  it('should use the provided title and top genres count', () => {
    // Arrange & Act
    render(<GenreChart books={mockBooks} title="Custom Title" topGenres={2} />);

    // Assert
    expect(screen.getByText('Custom Title')).toBeInTheDocument();
    expect(statisticsUtils.getTopGenresWithOthers).toHaveBeenCalledWith(mockGenreCounts, 2);
  });

  it('should show message when chart data is empty but books exist', () => {
    // Arrange
    (statisticsUtils.calculateGenreStatistics as jest.Mock).mockReturnValue([]);
    (statisticsUtils.getTopGenresWithOthers as jest.Mock).mockReturnValue([]);

    // Act
    render(<GenreChart books={mockBooks} />);

    // Assert
    expect(screen.getByText('No genre data available')).toBeInTheDocument();
  });
});
