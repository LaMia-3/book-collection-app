import React from 'react';
import { render, screen } from '@testing-library/react';
import { BookShelf } from '../BookShelf';
import { Book } from '@/types/book';
import '@testing-library/jest-dom';

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

describe('BookShelf', () => {
  const mockOnBookClick = jest.fn();

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('renders empty state when no books are provided', () => {
    render(<BookShelf books={[]} onBookClick={mockOnBookClick} />);
    expect(screen.getByText('Your library awaits')).toBeInTheDocument();
  });

  it('renders all reading status sections when books with various statuses are provided', () => {
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
    expect(screen.getByText('Completed Books')).toBeInTheDocument();
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

  it('renders the On Hold section between Currently Reading and Completed Books', () => {
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

    const { container } = render(<BookShelf books={books} onBookClick={mockOnBookClick} />);
    
    // Get all section headings
    const headings = screen.getAllByRole('heading');
    
    // Check the order of the sections
    expect(headings[0].textContent).toBe('Currently Reading');
    expect(headings[1].textContent).toBe('On Hold');
    expect(headings[2].textContent).toBe('Completed Books');
  });

  it('only shows the On Hold section when books with on-hold status are present', () => {
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

  it('correctly filters books into On Hold section', () => {
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
