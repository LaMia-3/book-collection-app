/// <reference types="@testing-library/jest-dom" />
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ManualAddBookForm } from '../ManualAddBookForm';
import { Book } from '@/types/book';

// Mock UUID to return a predictable value
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234')
}));

// Mock the date for consistent test results
const mockDate = new Date('2025-08-18T12:00:00Z');
const mockDateString = mockDate.toISOString();
const mockCompletionDate = new Date('2025-08-15T12:00:00Z');
const mockCompletionDateString = mockCompletionDate.toISOString();
jest.spyOn(global, 'Date').mockImplementation(() => mockDate as unknown as Date);

// Mock the form components to simplify testing
jest.mock('@/components/ui/form', () => ({
  Form: ({ children }: { children: React.ReactNode }) => <div data-testid="form">{children}</div>,
  FormField: ({ render }: any) => render({ field: { value: '', onChange: jest.fn() } }),
  FormItem: ({ children }: { children: React.ReactNode }) => <div data-testid="form-item">{children}</div>,
  FormLabel: ({ children }: { children: React.ReactNode }) => <label data-testid="form-label">{children}</label>,
  FormControl: ({ children }: { children: React.ReactNode }) => <div data-testid="form-control">{children}</div>,
  FormMessage: () => <div data-testid="form-message" />
}));

jest.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input data-testid="input" {...props} />
}));

jest.mock('@/components/ui/textarea', () => ({
  Textarea: (props: any) => <textarea data-testid="textarea" {...props} />
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, type }: { children: React.ReactNode, onClick?: () => void, type?: "button" | "submit" | "reset" }) => 
    <button data-testid="button" type={type} onClick={onClick}>{children}</button>
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div data-testid="select">{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div data-testid="select-trigger">{children}</div>,
  SelectValue: () => <div data-testid="select-value" />,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div data-testid="select-content">{children}</div>,
  SelectItem: ({ value, children }: { value: string, children: React.ReactNode }) => 
    <div data-testid={`select-item-${value}`}>{children}</div>
}));

jest.mock('@/components/ui/calendar', () => ({
  Calendar: () => <div data-testid="calendar" />
}));

jest.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <div data-testid="popover">{children}</div>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => <div data-testid="popover-trigger">{children}</div>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => <div data-testid="popover-content">{children}</div>
}));

// Mock the ImageUploader component
jest.mock('../../ImageUploader', () => ({
  ImageUploader: ({ initialImage, onImageChange }: { initialImage: string, onImageChange: (image: string) => void }) => (
    <div data-testid="image-uploader">
      <button 
        data-testid="mock-upload-button" 
        onClick={() => onImageChange('mock-image-data.jpg')}
      >
        Upload Image
      </button>
      <span>Current image: {initialImage}</span>
    </div>
  )
}));

describe('ManualAddBookForm Component', () => {
  const mockOnSave = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('renders form fields correctly', () => {
    render(<ManualAddBookForm onSave={mockOnSave} />);
    
    // Check essential form elements
    expect(screen.getByTestId('form')).toBeInTheDocument();
    expect(screen.getByTestId('image-uploader')).toBeInTheDocument();
    expect(screen.getByText('Title *')).toBeInTheDocument();
    expect(screen.getByText('Author *')).toBeInTheDocument();
    expect(screen.getByText('ISBN')).toBeInTheDocument();
    expect(screen.getByText('Reading Status *')).toBeInTheDocument();
    
    // Verify there's only one image uploader in the document
    const imageUploaders = screen.getAllByTestId('image-uploader');
    expect(imageUploaders.length).toBe(1);
  });
  
  test('shows completedDate field when status is completed', () => {
    // Mock form.watch for status to return 'completed'
    jest.spyOn(require('react-hook-form'), 'useForm').mockImplementation(() => ({
      handleSubmit: jest.fn(fn => jest.fn()),
      control: {},
      watch: jest.fn(name => name === 'status' ? 'completed' : ''),
      getValues: jest.fn(),
      setValue: jest.fn()
    }));
    
    render(<ManualAddBookForm onSave={mockOnSave} />);
    
    // Check that the Completion Date field is shown
    expect(screen.getByText('Completion Date')).toBeInTheDocument();
    
    // Clean up mock
    jest.restoreAllMocks();
  });
  
  test('form submits with completed status and completedDate', () => {
    // Create a controlled mock of the form submission
    const mockHandleSubmit = jest.fn(callback => {
      return (e) => {
        e?.preventDefault?.();
        // Call the form's submit handler directly with our test data
        callback({
          title: 'Test Book',
          author: 'Test Author',
          status: 'completed',
          completedDate: mockCompletionDate
        });
      };
    });
    
    // Mock useForm to return our controlled form handlers
    jest.spyOn(require('react-hook-form'), 'useForm').mockImplementation(() => ({
      handleSubmit: mockHandleSubmit,
      control: {},
      watch: jest.fn(),
      getValues: jest.fn(),
      setValue: jest.fn()
    }));
    
    render(<ManualAddBookForm onSave={mockOnSave} />);
    
    // Submit the form
    const submitButton = screen.getByText('Save Book');
    fireEvent.click(submitButton);
    
    // Check onSave was called with the right data
    expect(mockOnSave).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Test Book',
        author: 'Test Author',
        status: 'completed',
        completedDate: expect.any(String)
      })
    );
    
    // Clean up mock
    jest.restoreAllMocks();
  });

  test('form submits with DNF status correctly', () => {
    // Create a controlled mock of the form submission for DNF status
    const mockHandleSubmit = jest.fn(callback => {
      return (e) => {
        e?.preventDefault?.();
        // Call the form's submit handler with DNF status
        callback({
          title: 'DNF Book',
          author: 'Test Author',
          status: 'dnf',
        });
      };
    });
    
    // Mock useForm to return our controlled form handlers
    jest.spyOn(require('react-hook-form'), 'useForm').mockImplementation(() => ({
      handleSubmit: mockHandleSubmit,
      control: {},
      watch: jest.fn(),
      getValues: jest.fn(),
      setValue: jest.fn()
    }));
    
    render(<ManualAddBookForm onSave={mockOnSave} />);
    
    // Submit the form
    const submitButton = screen.getByText('Save Book');
    fireEvent.click(submitButton);
    
    // Check onSave was called with DNF status preserved correctly
    expect(mockOnSave).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'DNF Book',
        author: 'Test Author',
        status: 'dnf', // Should be 'dnf', not converted to 'want-to-read'
      })
    );
    
    // Clean up mock
    jest.restoreAllMocks();
  });
});
