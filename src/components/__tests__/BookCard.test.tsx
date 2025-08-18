/// <reference types="@testing-library/jest-dom" />
import React from 'react';
import { render, screen } from '@testing-library/react';
import { BookCard } from '../BookCard';
import { createLogger } from '@/utils/loggingUtils';
import { Book } from '@/types/book';

// Mock the loggingUtils module
jest.mock('@/utils/loggingUtils', () => {
  // Define mock functions inside the mock factory
  const mockDebug = jest.fn();
  const mockTrace = jest.fn();
  const mockInfo = jest.fn();
  const mockWarn = jest.fn();
  const mockError = jest.fn();
  
  // Make the mocks accessible outside
  (global as any).mockDebug = mockDebug;
  (global as any).mockTrace = mockTrace;
  (global as any).mockInfo = mockInfo;
  (global as any).mockWarn = mockWarn;
  (global as any).mockError = mockError;
  
  return {
    createLogger: jest.fn().mockReturnValue({
      debug: mockDebug,
      trace: mockTrace,
      info: mockInfo,
      warn: mockWarn,
      error: mockError,
    }),
  };
});

// Declare mocks globally for TypeScript
declare global {
  var mockDebug: jest.Mock;
  var mockTrace: jest.Mock;
  var mockInfo: jest.Mock;
  var mockWarn: jest.Mock;
  var mockError: jest.Mock;
}

// Mock the UI components to simplify testing
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
  CardContent: ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <div data-testid="card-content" className={className}>{children}</div>
  )
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <span data-testid="badge" className={className}>{children}</span>
  )
}));

jest.mock('lucide-react', () => ({
  Star: () => <span data-testid="star-icon">★</span>,
  BookOpen: () => <span data-testid="book-open-icon">📖</span>
}));

describe('BookCard Component', () => {
  const mockBook: Book = {
    id: 'book123',
    title: 'Test Book',
    author: 'Test Author',
    genre: 'Fiction/Mystery/Thriller', // Changed to string format that BookCard can parse
    rating: 4,
    status: 'completed',
    spineColor: 1,
    addedDate: new Date().toISOString(),
    isPartOfSeries: false
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('renders book information correctly', () => {
    render(<BookCard book={mockBook} />);
    
    expect(screen.getByText('Test Book')).toBeInTheDocument();
    expect(screen.getByText('Test Author')).toBeInTheDocument();
    
    // Verify stars are rendered for rating
    const stars = screen.getAllByTestId('star-icon');
    expect(stars).toHaveLength(5);
  });
  
  test('logs genre information when rendering genres from slash-separated string', () => {
    render(<BookCard book={mockBook} />);
    
    // In the actual component, the genre string is displayed as is
    const badge = screen.getByTestId('badge');
    expect(badge.textContent).toBe('Fiction/Mystery/Thriller');
    
    // Check that the logger was called with the correct genre
    expect(mockDebug).toHaveBeenCalledWith(
      expect.stringContaining('Rendering'), 
      expect.objectContaining({ genre: 'Fiction/Mystery/Thriller' })
    );
  });
  
  test('logs single genre information when rendering genre as string', () => {
    const singleGenreBook = {
      ...mockBook,
      genre: 'Fiction'
    };
    
    render(<BookCard book={singleGenreBook} />);
    
    // Verify genre badge is rendered
    const badge = screen.getByTestId('badge');
    expect(badge.textContent).toBe('Fiction');
    
    // Check logging
    expect(mockDebug).toHaveBeenCalledWith(
      expect.stringContaining('Rendering'), 
      expect.objectContaining({ genre: 'Fiction' })
    );
  });
  
  test('logs when no genre information is available', () => {
    const noGenreBook = {
      ...mockBook,
      genre: undefined
    };
    
    render(<BookCard book={noGenreBook} />);
    
    // Verify no genre badge is rendered
    expect(screen.queryByTestId('badge')).not.toBeInTheDocument();
    
    // Check logging
    expect(mockDebug).toHaveBeenCalledWith(
      expect.stringContaining('Rendering'), 
      expect.objectContaining({ bookId: 'book123' })
    );
  });
  
  test('does not render genres in compact mode', () => {
    render(<BookCard book={mockBook} compact={true} />);
    
    // Verify no badges are rendered in compact mode
    expect(screen.queryByTestId('badge')).not.toBeInTheDocument();
    
    // In compact mode, the genre renderer function is not called, so no logs for genres
    expect(mockDebug).not.toHaveBeenCalledWith('Rendering genre in BookCard', expect.any(Object));
  });
  
  test('applies custom className when provided', () => {
    render(<BookCard book={mockBook} className="custom-class" />);
    
    const card = screen.getByTestId('card');
    expect(card).toHaveClass('custom-class');
  });
});
