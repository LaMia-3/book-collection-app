import React from 'react';
import { render, screen } from '@testing-library/react';
import { BookCoverView } from '../BookCoverView';
import { Book } from '@/types/book';
import '@testing-library/jest-dom';
import { ThemeProvider } from '@/components/ui-common/ThemeProvider';
import { PaletteProvider } from '@/contexts/PaletteContext';

// Mock the ThemeProvider
jest.mock('@/components/ui-common/ThemeProvider', () => ({
  useTheme: () => ({ theme: 'light' }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock the PaletteContext
jest.mock('@/contexts/PaletteContext', () => ({
  usePalette: () => ({ selectedPalette: null }),
  PaletteProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('BookCoverView', () => {
  const mockOnBookClick = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders empty state when no books are provided', () => {
    render(
      <PaletteProvider>
        <ThemeProvider>
          <BookCoverView books={[]} onBookClick={mockOnBookClick} />
        </ThemeProvider>
      </PaletteProvider>
    );

    expect(screen.getByText('Your library is empty')).toBeInTheDocument();
  });

  it('renders books with different statuses correctly', () => {
    const books: Book[] = [
      {
        id: '1',
        title: 'Reading Book',
        author: 'Author 1',
        status: 'reading',
        spineColor: 1,
        addedDate: '2023-01-01'
      },
      {
        id: '2',
        title: 'Completed Book',
        author: 'Author 2',
        status: 'completed',
        spineColor: 2,
        addedDate: '2023-01-02'
      },
      {
        id: '3',
        title: 'Want to Read Book',
        author: 'Author 3',
        status: 'want-to-read',
        spineColor: 3,
        addedDate: '2023-01-03'
      },
      {
        id: '4',
        title: 'DNF Book',
        author: 'Author 4',
        status: 'dnf',
        spineColor: 4,
        addedDate: '2023-01-04'
      },
      {
        id: '5',
        title: 'On Hold Book',
        author: 'Author 5',
        status: 'on-hold',
        spineColor: 5,
        addedDate: '2023-01-05'
      }
    ];

    render(
      <PaletteProvider>
        <ThemeProvider>
          <BookCoverView books={books} onBookClick={mockOnBookClick} />
        </ThemeProvider>
      </PaletteProvider>
    );

    // Check that all book titles are rendered
    // Using getAllByText to handle cases where the text might appear multiple times (like in cover and title)
    expect(screen.getAllByText('Completed Book').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Want to Read Book').length).toBeGreaterThan(0);
    expect(screen.getAllByText('DNF Book').length).toBeGreaterThan(0);
    expect(screen.getAllByText('On Hold Book').length).toBeGreaterThan(0);
    
    // For 'Reading Book', we need to check if it exists either as an exact match or within a node
    // Since it might be rendered differently
    const readingBookElements = screen.getAllByText(/Reading Book/i);
    expect(readingBookElements.length).toBeGreaterThan(0);

    // Check that all status badges are rendered correctly
    expect(screen.getByText('Reading')).toBeInTheDocument();
    expect(screen.getByText('Read')).toBeInTheDocument();
    expect(screen.getByText('Want to Read')).toBeInTheDocument();
    expect(screen.getByText('Did Not Finish')).toBeInTheDocument();
    expect(screen.getByText('On Hold')).toBeInTheDocument();
  });

  it('renders on-hold status badge with correct styling', () => {
    const books: Book[] = [
      {
        id: '5',
        title: 'On Hold Book',
        author: 'Author 5',
        status: 'on-hold',
        spineColor: 5,
        addedDate: '2023-01-05'
      }
    ];

    render(
      <PaletteProvider>
        <ThemeProvider>
          <BookCoverView books={books} onBookClick={mockOnBookClick} />
        </ThemeProvider>
      </PaletteProvider>
    );

    // Check that the On Hold badge is rendered with the correct text
    const onHoldBadge = screen.getByText('On Hold');
    expect(onHoldBadge).toBeInTheDocument();
    
    // Check that the badge has the correct styling class
    expect(onHoldBadge.closest('.bg-gradient-amber')).toBeInTheDocument();
  });
});
