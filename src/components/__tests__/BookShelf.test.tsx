import React from 'react';
import { render, screen } from '@testing-library/react';
import { BookShelf } from '../BookShelf';
import { Book } from '@/types/book';
import '@testing-library/jest-dom';
import { useSettings } from '@/contexts/SettingsContext';

// Mock window.innerWidth to avoid issues with responsive design calculations
Object.defineProperty(window, 'innerWidth', { value: 1200 });

// Mock BookSpine component since we're only testing the BookShelf structure
jest.mock('../BookSpine', () => ({
  BookSpine: ({ book, onClick }: any) => (
    <div 
      data-testid={`book-spine-${book.id}`}
      data-status={book.status}
      className="mock-book-spine"
      onClick={() => onClick(book)}
    >
      {book.title}
    </div>
  )
}));

// Mock the SettingsContext
jest.mock('@/contexts/SettingsContext', () => ({
  useSettings: jest.fn()
}));

// Mock the InfoIcon for tooltip testing
jest.mock('lucide-react', () => ({
  InfoIcon: () => <span data-testid="tooltip-trigger" />
}));

// Mock tooltips
jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: any) => <>{children}</>,
  TooltipContent: ({ children }: any) => <div data-testid="tooltip-content">{children}</div>,
  TooltipProvider: ({ children }: any) => <>{children}</>,
  TooltipTrigger: ({ children }: any) => <>{children}</>
}));

describe('BookShelf', () => {
  const mockOnBookClick = jest.fn();
  
  // Default mock settings
  const defaultMockSettings = {
    settings: {
      displayOptions: {
        groupSpecialStatuses: false,
        shelfOrder: ['reading', 'want-to-read', 'completed', 'on-hold', 'dnf']
      }
    },
    updateSettings: jest.fn(),
    isLoading: false,
    error: null
  };

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Set up default settings mock
    (useSettings as jest.Mock).mockReturnValue(defaultMockSettings);
  });

  it('renders empty state when no books are provided', () => {
    render(<BookShelf books={[]} onBookClick={mockOnBookClick} />);
    expect(screen.getByText('Your library awaits')).toBeInTheDocument();
  });

  it('renders all reading status sections when books with various statuses are provided with default order', () => {
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

    render(<BookShelf books={books} onBookClick={mockOnBookClick} />);

    // Check that all section headings are rendered
    expect(screen.getByText('Currently Reading')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Want to Read')).toBeInTheDocument();
    expect(screen.getByText('Did Not Finish')).toBeInTheDocument();
    expect(screen.getByText('On Hold')).toBeInTheDocument();

    // Check that all book spines are rendered
    expect(screen.getByText('Reading Book')).toBeInTheDocument();
    expect(screen.getByText('Completed Book')).toBeInTheDocument();
    expect(screen.getByText('Want to Read Book')).toBeInTheDocument();
    expect(screen.getByText('DNF Book')).toBeInTheDocument();
    expect(screen.getByText('On Hold Book')).toBeInTheDocument();
  });

  it('renders shelves in custom order based on settings', () => {
    // Mock settings with custom order
    const customOrder = ['completed', 'reading', 'want-to-read', 'on-hold', 'dnf'];
    (useSettings as jest.Mock).mockReturnValue({
      ...defaultMockSettings,
      settings: {
        displayOptions: {
          groupSpecialStatuses: false,
          shelfOrder: customOrder
        }
      }
    });
    
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
        title: 'On Hold Book',
        author: 'Author 4',
        status: 'on-hold',
        spineColor: 4,
        addedDate: '2023-01-04'
      }
    ];

    render(<BookShelf books={books} onBookClick={mockOnBookClick} />);
    
    // Get all section headings
    const headings = screen.getAllByRole('heading', { level: 3 });
    
    // Check that the order matches our custom order
    expect(headings[0].textContent).toBe('Completed');
    expect(headings[1].textContent).toBe('Currently Reading');
    expect(headings[2].textContent).toBe('Want to Read');
    expect(headings[3].textContent).toBe('On Hold');
  });

  it('respects groupSpecialStatuses setting when rendering shelves', () => {
    // Mock settings with groupSpecialStatuses enabled
    (useSettings as jest.Mock).mockReturnValue({
      ...defaultMockSettings,
      settings: {
        displayOptions: {
          groupSpecialStatuses: true,
          shelfOrder: ['reading', 'want-to-read', 'completed', 'on-hold', 'dnf']
        }
      }
    });
    
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
        title: 'On Hold Book',
        author: 'Author 2',
        status: 'on-hold',
        spineColor: 2,
        addedDate: '2023-01-02'
      },
      {
        id: '3',
        title: 'DNF Book',
        author: 'Author 3',
        status: 'dnf',
        spineColor: 3,
        addedDate: '2023-01-03'
      },
      {
        id: '4',
        title: 'Completed Book',
        author: 'Author 4',
        status: 'completed',
        spineColor: 4,
        addedDate: '2023-01-04'
      }
    ];

    render(<BookShelf books={books} onBookClick={mockOnBookClick} />);
    
    // Check that On Hold and DNF sections are NOT rendered separately
    expect(screen.queryByText('On Hold')).not.toBeInTheDocument();
    expect(screen.queryByText('Did Not Finish')).not.toBeInTheDocument();
    
    // Check that the Completed section has tooltip indicating it includes other statuses
    const completedHeading = screen.getByText('Completed');
    expect(completedHeading.parentElement).toContainElement(
      screen.getByTestId('tooltip-trigger') || completedHeading.querySelector('svg')
    );
    
    // Check all books are rendered
    expect(screen.getByText('Reading Book')).toBeInTheDocument();
    expect(screen.getByText('On Hold Book')).toBeInTheDocument();
    expect(screen.getByText('DNF Book')).toBeInTheDocument();
    expect(screen.getByText('Completed Book')).toBeInTheDocument();
  });

  it('renders sections according to the default shelf order', () => {
    // Set explicit default order for test clarity
    (useSettings as jest.Mock).mockReturnValue({
      ...defaultMockSettings,
      settings: {
        displayOptions: {
          groupSpecialStatuses: false,
          shelfOrder: ['reading', 'on-hold', 'completed', 'want-to-read', 'dnf']
        }
      }
    });
    
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
        title: 'On Hold Book',
        author: 'Author 2',
        status: 'on-hold',
        spineColor: 2,
        addedDate: '2023-01-02'
      },
      {
        id: '3',
        title: 'Completed Book',
        author: 'Author 3',
        status: 'completed',
        spineColor: 3,
        addedDate: '2023-01-03'
      }
    ];

    render(<BookShelf books={books} onBookClick={mockOnBookClick} />);
    
    // Get all section headings
    const headings = screen.getAllByRole('heading');
    
    // Check that the order matches our specified order
    expect(headings[0].textContent).toBe('Currently Reading');
    expect(headings[1].textContent).toBe('On Hold');
    expect(headings[2].textContent).toBe('Completed');
  });

  it('only shows the On Hold section when books with on-hold status are present and grouping is disabled', () => {
    // Ensure groupSpecialStatuses is false
    (useSettings as jest.Mock).mockReturnValue({
      ...defaultMockSettings,
      settings: {
        displayOptions: {
          groupSpecialStatuses: false,
          shelfOrder: ['reading', 'want-to-read', 'completed', 'on-hold', 'dnf']
        }
      }
    });
    // Books without on-hold status
    const booksWithoutOnHold: Book[] = [
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
      }
    ];

    const { rerender } = render(<BookShelf books={booksWithoutOnHold} onBookClick={mockOnBookClick} />);
    
    // Check that On Hold section is not rendered
    expect(screen.queryByText('On Hold')).not.toBeInTheDocument();

    // Books with on-hold status
    const booksWithOnHold: Book[] = [
      ...booksWithoutOnHold,
      {
        id: '3',
        title: 'On Hold Book',
        author: 'Author 3',
        status: 'on-hold',
        spineColor: 3,
        addedDate: '2023-01-03'
      }
    ];

    // Re-render with books that include on-hold status
    rerender(<BookShelf books={booksWithOnHold} onBookClick={mockOnBookClick} />);
    
    // Check that On Hold section is now rendered
    expect(screen.getByText('On Hold')).toBeInTheDocument();
  });

  it('correctly filters books into On Hold section when grouping is disabled', () => {
    // Ensure groupSpecialStatuses is false
    (useSettings as jest.Mock).mockReturnValue({
      ...defaultMockSettings,
      settings: {
        displayOptions: {
          groupSpecialStatuses: false,
          shelfOrder: ['reading', 'want-to-read', 'completed', 'on-hold', 'dnf']
        }
      }
    });
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
        title: 'On Hold Book 1',
        author: 'Author 2',
        status: 'on-hold',
        spineColor: 2,
        addedDate: '2023-01-02'
      },
      {
        id: '3',
        title: 'On Hold Book 2',
        author: 'Author 3',
        status: 'on-hold',
        spineColor: 3,
        addedDate: '2023-01-03'
      },
      {
        id: '4',
        title: 'Completed Book',
        author: 'Author 4',
        status: 'completed',
        spineColor: 4,
        addedDate: '2023-01-04'
      }
    ];

    render(<BookShelf books={books} onBookClick={mockOnBookClick} />);
    
    // Get all the book spines
    const readingBook = screen.getByTestId('book-spine-1');
    const onHoldBook1 = screen.getByTestId('book-spine-2');
    const onHoldBook2 = screen.getByTestId('book-spine-3');
    const completedBook = screen.getByTestId('book-spine-4');
    
    // Check that books have correct status data attributes
    expect(readingBook).toHaveAttribute('data-status', 'reading');
    expect(onHoldBook1).toHaveAttribute('data-status', 'on-hold');
    expect(onHoldBook2).toHaveAttribute('data-status', 'on-hold');
    expect(completedBook).toHaveAttribute('data-status', 'completed');
    
    // Check that books are rendered with correct titles
    expect(screen.getByText('On Hold Book 1')).toBeInTheDocument();
    expect(screen.getByText('On Hold Book 2')).toBeInTheDocument();
  });
});
