/// <reference types="@testing-library/jest-dom" />
import React from 'react';
import { render, screen } from '@testing-library/react';
import { GenreDisplay } from '../GenreDisplay';
import { createLogger } from '@/utils/loggingUtils';

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

// Mock Badge component to simplify testing
jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: { children: React.ReactNode }) => (
    <div data-testid="badge" {...props}>
      {children}
    </div>
  ),
}));

describe('GenreDisplay Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('renders badges for each genre', () => {
    render(<GenreDisplay genres={['Fiction', 'Mystery', 'Thriller']} />);
    
    const badges = screen.getAllByTestId('badge');
    expect(badges).toHaveLength(3);
    expect(badges[0].textContent).toBe('Fiction');
    expect(badges[1].textContent).toBe('Mystery');
    expect(badges[2].textContent).toBe('Thriller');
    
    // Verify logging
    expect(mockDebug).toHaveBeenCalledWith('Rendering genre display', { genreType: 'object' });
    expect(mockTrace).toHaveBeenCalledWith('Standardized genres', { 
      genreCount: 3, 
      genres: ['Fiction', 'Mystery', 'Thriller']
    });
    expect(mockDebug).toHaveBeenCalledWith('Rendering genres', { count: 3 });
  });
  
  test('handles string input with comma separator', () => {
    render(<GenreDisplay genres="Fiction, Mystery, Thriller" />);
    
    const badges = screen.getAllByTestId('badge');
    expect(badges).toHaveLength(3);
    
    // Verify logging for string input
    expect(mockDebug).toHaveBeenCalledWith('Rendering genre display', { genreType: 'string' });
  });
  
  test('handles string input with slash separator', () => {
    render(<GenreDisplay genres="Fiction/Mystery/Thriller" />);
    
    const badges = screen.getAllByTestId('badge');
    expect(badges).toHaveLength(3);
  });
  
  test('displays message when no genres are provided', () => {
    render(<GenreDisplay genres={[]} />);
    
    expect(screen.queryByTestId('badge')).not.toBeInTheDocument();
    expect(screen.getByText('No genres specified')).toBeInTheDocument();
    
    // Verify logging for empty input
    expect(mockDebug).toHaveBeenCalledWith('No genres to display');
  });
  
  test('displays message when empty string is provided', () => {
    render(<GenreDisplay genres="" />);
    
    expect(screen.queryByTestId('badge')).not.toBeInTheDocument();
    expect(screen.getByText('No genres specified')).toBeInTheDocument();
  });
  
  test('applies custom className when provided', () => {
    render(<GenreDisplay genres={['Fiction']} className="custom-class" />);
    
    const container = screen.getByTestId('badge').parentElement;
    expect(container).toHaveClass('custom-class');
  });
  
  test('logs the appropriate messages during rendering', () => {
    render(<GenreDisplay genres={['Fiction', 'Mystery']} />);
    
    // Check for all expected log calls
    expect(mockDebug).toHaveBeenCalledWith('Rendering genre display', expect.any(Object));
    expect(mockTrace).toHaveBeenCalledWith('Standardized genres', expect.any(Object));
    expect(mockDebug).toHaveBeenCalledWith('Rendering genres', expect.any(Object));
    
    // Verify log message with genre count
    expect(mockDebug).toHaveBeenCalledWith('Rendering genres', { count: 2 });
  });
});
