/// <reference types="@testing-library/jest-dom" />
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BookDetails } from '../BookDetails';
import { Book } from '@/types/book';
import { userEvent } from '@testing-library/user-event';

// Mock UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children, onClick, className }: { children: React.ReactNode, onClick?: () => void, className?: string }) => (
    <h2 data-testid="card-title" onClick={onClick} className={className}>{children}</h2>
  ),
  CardContent: ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <div data-testid="card-content" className={className}>{children}</div>
  )
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, className, ...props }: any) => (
    <input
      data-testid="input"
      value={value}
      onChange={onChange}
      className={className}
      {...props}
    />
  )
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant, size, className, ...props }: any) => (
    <button
      data-testid="button"
      onClick={onClick}
      className={className}
      data-variant={variant}
      data-size={size}
      {...props}
    >
      {children}
    </button>
  )
}));

jest.mock('@/components/ui/read-only-field', () => ({
  ReadOnlyField: ({ label, value, icon }: any) => (
    <div data-testid="read-only-field">
      <span data-testid="read-only-label">{label}</span>
      <div data-testid="read-only-value">{value}</div>
      {icon && <span data-testid="read-only-icon" />}
    </div>
  )
}));

jest.mock('lucide-react', () => ({
  Edit2: () => <span data-testid="edit-icon">✏️</span>,
  Eye: () => <span data-testid="eye-icon">👁️</span>,
  Pencil: () => <span data-testid="pencil-icon">✏️</span>,
  User: () => <span data-testid="user-icon">👤</span>,
  BookOpen: () => <span data-testid="book-open-icon">📖</span>,
  CalendarIcon: () => <span data-testid="calendar-icon">📅</span>,
  ChevronDown: () => <span data-testid="chevron-down-icon">⯆</span>,
  ChevronUp: () => <span data-testid="chevron-up-icon">⯅</span>,
  Library: () => <span data-testid="library-icon">📚</span>,
  Database: () => <span data-testid="database-icon">🗄️</span>,
  AlertCircle: () => <span data-testid="alert-circle-icon">⚠️</span>,
  Trash2: () => <span data-testid="trash-icon">🗑️</span>,
  Plus: () => <span data-testid="plus-icon">➕</span>,
  X: () => <span data-testid="x-icon">❌</span>,
  Star: () => <span data-testid="star-icon">★</span>
}));

// Mock services
jest.mock('@/services/SeriesService', () => ({
  getSeriesList: jest.fn().mockResolvedValue([])
}));

describe('BookDetails Component', () => {
  const mockBook: Book = {
    id: 'book123',
    title: 'Test Book',
    author: 'Test Author',
    pageCount: 250,
    publishedDate: '2023-01-01',
    description: 'This is a test book description',
    genre: 'Fiction',
    rating: 4,
    status: 'completed',
    completedDate: '2023-06-15',
    addedDate: new Date().toISOString(),
    isPartOfSeries: false,
    spineColor: 1
  };

  const defaultProps = {
    book: mockBook,
    onSave: jest.fn(),
    onClose: jest.fn(),
    onDelete: jest.fn(),
    onUpdate: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders in view mode by default', () => {
    render(<BookDetails {...defaultProps} />);
    
    // Check that view mode components are rendered
    expect(screen.getByTestId('eye-icon')).toBeInTheDocument(); // Eye icon for edit mode button
    expect(screen.getByText('Test Book')).toBeInTheDocument();
    expect(screen.getByText('Test Author')).toBeInTheDocument();
    
    // The action buttons should not be visible in view mode
    const saveButton = screen.queryByText('Save Changes');
    expect(saveButton).not.toBeInTheDocument();
    
    // The floating edit button should be visible in view mode
    const floatingEditButton = screen.getByLabelText('Switch to edit mode');
    expect(floatingEditButton).toBeInTheDocument();
  });

  test('switches to edit mode when toggle button is clicked', async () => {
    render(<BookDetails {...defaultProps} />);
    
    // Initially in view mode
    expect(screen.getByTestId('eye-icon')).toBeInTheDocument();
    
    // Click the toggle button
    const toggleButton = screen.getByLabelText('Switch to edit mode');
    fireEvent.click(toggleButton);
    
    // Should now be in edit mode
    await waitFor(() => {
      expect(screen.getByTestId('pencil-icon')).toBeInTheDocument();
      expect(screen.queryByText('Save Changes')).toBeInTheDocument();
    });
    
    // The floating edit button should not be visible in edit mode
    expect(screen.queryByLabelText('Switch to edit mode')).not.toBeInTheDocument();
  });

  test('toggles between view and edit modes', async () => {
    render(<BookDetails {...defaultProps} />);
    
    // Start in view mode
    expect(screen.getByTestId('eye-icon')).toBeInTheDocument();
    
    // Switch to edit mode
    const viewModeToggleButton = screen.getByLabelText('Switch to edit mode');
    fireEvent.click(viewModeToggleButton);
    
    // Verify edit mode
    await waitFor(() => {
      expect(screen.getByTestId('pencil-icon')).toBeInTheDocument();
    });
    
    // Switch back to view mode
    const editModeToggleButton = screen.getByLabelText('Switch to view mode');
    fireEvent.click(editModeToggleButton);
    
    // Verify view mode
    await waitFor(() => {
      expect(screen.getByTestId('eye-icon')).toBeInTheDocument();
    });
  });

  test('displays book fields correctly in view mode', () => {
    render(<BookDetails {...defaultProps} />);
    
    // Title should be displayed
    expect(screen.getByText('Test Book')).toBeInTheDocument();
    
    // Author should be displayed
    expect(screen.getByText('Test Author')).toBeInTheDocument();
    
    // Page count should be displayed
    expect(screen.getByText('250 pages')).toBeInTheDocument();
    
    // Published date should be displayed
    expect(screen.getByText(/Published: 2023-01-01/)).toBeInTheDocument();
    
    // Description should be displayed
    expect(screen.getByText('This is a test book description')).toBeInTheDocument();
  });

  test('allows editing in edit mode', async () => {
    render(<BookDetails {...defaultProps} />);
    
    // Switch to edit mode
    const toggleButton = screen.getByLabelText('Switch to edit mode');
    fireEvent.click(toggleButton);
    
    // In edit mode, title should be editable on click
    await waitFor(() => {
      const titleElement = screen.getByText('Test Book');
      fireEvent.click(titleElement);
    });
    
    // Input should appear for title editing
    const titleInput = screen.getByDisplayValue('Test Book');
    expect(titleInput).toBeInTheDocument();
    
    // Change title
    fireEvent.change(titleInput, { target: { value: 'Updated Book Title' } });
    expect(titleInput).toHaveValue('Updated Book Title');
  });

  test('save button is only visible in edit mode', async () => {
    render(<BookDetails {...defaultProps} />);
    
    // Initially in view mode, save button should not be visible
    expect(screen.queryByText('Save Changes')).not.toBeInTheDocument();
    
    // Switch to edit mode
    const toggleButton = screen.getByLabelText('Switch to edit mode');
    fireEvent.click(toggleButton);
    
    // In edit mode, save button should be visible
    await waitFor(() => {
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });
  });

  test('delete button is only visible in edit mode', async () => {
    render(<BookDetails {...defaultProps} />);
    
    // Initially in view mode, delete button should not be visible
    expect(screen.queryByText('Delete Book')).not.toBeInTheDocument();
    
    // Switch to edit mode
    const toggleButton = screen.getByLabelText('Switch to edit mode');
    fireEvent.click(toggleButton);
    
    // In edit mode, delete button should be visible
    await waitFor(() => {
      expect(screen.getByText('Delete Book')).toBeInTheDocument();
    });
  });
  
  test('genre section displays correctly in view mode', () => {
    render(<BookDetails {...defaultProps} />);
    
    // In view mode, the genre should be displayed in a read-only field
    const readOnlyLabels = screen.getAllByTestId('read-only-label');
    const genreLabel = readOnlyLabels.find(label => label.textContent === 'Genre');
    const genreField = genreLabel?.closest('[data-testid="read-only-field"]');
    
    expect(genreField).toBeInTheDocument();
    
    // The edit affordance (pencil icon) should not be visible in view mode
    expect(screen.queryByLabelText('Edit book genres')).not.toBeInTheDocument();
  });
  
  test('genre section becomes editable when switching to edit mode', async () => {
    render(<BookDetails {...defaultProps} />);
    
    // Switch to edit mode
    const toggleButton = screen.getByLabelText('Switch to edit mode');
    fireEvent.click(toggleButton);
    
    // In edit mode, the GenreDisplay should be visible with edit affordance
    await waitFor(() => {
      // Since we're mocking GenreDisplay, check for the edit button instead
      expect(screen.getByLabelText('Edit book genres')).toBeInTheDocument();
    });
    
    // Click on the genre to edit it
    fireEvent.click(screen.getByLabelText('Edit book genres'));
    
    // Input field should appear
    await waitFor(() => {
      expect(screen.getByLabelText('Book genres')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Fiction, Fantasy, Mystery...')).toBeInTheDocument();
    });
  });
});
