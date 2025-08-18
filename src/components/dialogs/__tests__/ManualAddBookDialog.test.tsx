/// <reference types="@testing-library/jest-dom" />
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ManualAddBookDialog } from '../ManualAddBookDialog';
import { Book } from '@/types/book';

// Mock the ManualAddBookForm component
jest.mock('../../forms/ManualAddBookForm', () => ({
  ManualAddBookForm: ({ onSave }: { onSave: (book: Book) => void }) => (
    <div data-testid="manual-add-book-form">
      <button data-testid="mock-save-button" onClick={() => onSave({
        id: 'mock-book-id',
        title: 'Mock Book Title',
        author: 'Mock Author',
        status: 'want-to-read',
        addedDate: '2025-08-18T12:00:00Z',
        genre: [],
        isbn10: [],
        isbn13: [],
        spineColor: 1,
        isPartOfSeries: false,
        sourceType: 'manual'
      })}>
        Save Book
      </button>
    </div>
  )
}));

// Mock the Dialog components
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, onOpenChange, children }: { open: boolean, onOpenChange: (open: boolean) => void, children: React.ReactNode }) => (
    open ? <div data-testid="dialog">{children}</div> : null
  ),
  DialogContent: ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <div data-testid="dialog-content" className={className}>{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-header">{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-title">{children}</div>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-description">{children}</div>
  )
}));

describe('ManualAddBookDialog Component', () => {
  const mockOnClose = jest.fn();
  const mockOnSave = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('renders dialog when isOpen is true', () => {
    render(
      <ManualAddBookDialog 
        isOpen={true} 
        onClose={mockOnClose} 
        onSave={mockOnSave} 
      />
    );
    
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    expect(screen.getByTestId('dialog-content')).toBeInTheDocument();
    expect(screen.getByTestId('dialog-header')).toBeInTheDocument();
    expect(screen.getByTestId('dialog-title')).toBeInTheDocument();
    expect(screen.getByText('Add Book Manually')).toBeInTheDocument();
    expect(screen.getByTestId('manual-add-book-form')).toBeInTheDocument();
  });
  
  test('does not render dialog when isOpen is false', () => {
    render(
      <ManualAddBookDialog 
        isOpen={false} 
        onClose={mockOnClose} 
        onSave={mockOnSave} 
      />
    );
    
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });
  
  test('calls onSave with book data when form is submitted', () => {
    render(
      <ManualAddBookDialog 
        isOpen={true} 
        onClose={mockOnClose} 
        onSave={mockOnSave} 
      />
    );
    
    // Find and click the save button in the mocked form
    const saveButton = screen.getByTestId('mock-save-button');
    fireEvent.click(saveButton);
    
    // Verify onSave was called with the book data
    expect(mockOnSave).toHaveBeenCalledWith(expect.objectContaining({
      id: 'mock-book-id',
      title: 'Mock Book Title',
      author: 'Mock Author',
      status: 'want-to-read',
      sourceType: 'manual'
    }));
  });
  
  test('dialog has proper styling', () => {
    render(
      <ManualAddBookDialog 
        isOpen={true} 
        onClose={mockOnClose} 
        onSave={mockOnSave} 
      />
    );
    
    const dialogContent = screen.getByTestId('dialog-content');
    expect(dialogContent).toHaveClass('max-w-3xl');
    expect(dialogContent).toHaveClass('max-h-[90vh]');
    expect(dialogContent).toHaveClass('overflow-y-auto');
  });
});
