import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { GenreCollapsible } from '../GenreCollapsible';
import '@testing-library/jest-dom';

// Mock TruncatedText component since we're testing GenreCollapsible functionality
jest.mock('../TruncatedText', () => ({
  TruncatedText: ({ text }: { text: string }) => React.createElement('span', { 'data-testid': 'truncated-text' }, text)
}));

describe('GenreCollapsible Component', () => {
  it('renders message when no genres provided', () => {
    render(<GenreCollapsible genres={[]} />);
    expect(screen.getByText('No genres')).toBeInTheDocument();
  });

  it('displays all genres when count is below the limit', () => {
    const genres = ['Fiction', 'Drama'];
    render(<GenreCollapsible genres={genres} limit={3} />);
    
    expect(screen.getAllByTestId('truncated-text').length).toBe(2);
    expect(screen.getByText('Fiction')).toBeInTheDocument();
    expect(screen.getByText('Drama')).toBeInTheDocument();
    expect(screen.queryByText(/more/)).not.toBeInTheDocument();
  });

  it('collapses genres when more than the limit', () => {
    const genres = ['Fiction', 'Drama', 'Fantasy', 'Mystery'];
    render(<GenreCollapsible genres={genres} limit={2} />);
    
    // Should show first 2 genres
    expect(screen.getAllByTestId('truncated-text').length).toBe(2);
    
    // Should show a "+2 more" button
    expect(screen.getByText('+2 more')).toBeInTheDocument();
    
    // Fantasy and Mystery shouldn't be visible yet
    expect(screen.queryByText('Fantasy')).not.toBeInTheDocument();
    expect(screen.queryByText('Mystery')).not.toBeInTheDocument();
  });

  it('expands to show all genres when clicking more button', () => {
    const genres = ['Fiction', 'Drama', 'Fantasy', 'Mystery'];
    render(<GenreCollapsible genres={genres} limit={2} />);
    
    // Click the "+2 more" button
    fireEvent.click(screen.getByText('+2 more'));
    
    // Now all genres should be visible
    expect(screen.getAllByTestId('truncated-text').length).toBe(4);
    expect(screen.getByText('Fiction')).toBeInTheDocument();
    expect(screen.getByText('Drama')).toBeInTheDocument();
    expect(screen.getByText('Fantasy')).toBeInTheDocument();
    expect(screen.getByText('Mystery')).toBeInTheDocument();
    
    // Now there should be a "Show less" button
    expect(screen.getByText('Show less')).toBeInTheDocument();
  });

  it('collapses back when clicking show less button', () => {
    const genres = ['Fiction', 'Drama', 'Fantasy', 'Mystery'];
    render(<GenreCollapsible genres={genres} limit={2} />);
    
    // Click to expand
    fireEvent.click(screen.getByText('+2 more'));
    
    // Click to collapse
    fireEvent.click(screen.getByText('Show less'));
    
    // Should be back to showing just the first 2 genres
    expect(screen.getAllByTestId('truncated-text').length).toBe(2);
    expect(screen.getByText('+2 more')).toBeInTheDocument();
  });

  it('uses the provided limit correctly', () => {
    const genres = ['Fiction', 'Drama', 'Fantasy', 'Mystery', 'Horror'];
    render(<GenreCollapsible genres={genres} limit={3} />);
    
    // Should show 3 genres and a "+2 more" button
    expect(screen.getAllByTestId('truncated-text').length).toBe(3);
    expect(screen.getByText('+2 more')).toBeInTheDocument();
  });

  it('handles null genres gracefully', () => {
    // @ts-ignore - Intentionally testing incorrect usage
    render(<GenreCollapsible genres={null} />);
    expect(screen.getByText('No genres')).toBeInTheDocument();
  });
});
