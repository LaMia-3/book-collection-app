import React, { useState, useEffect, useRef, KeyboardEvent, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Book } from "@/types/book";
import { Series } from "@/types/series";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ReadOnlyField } from "@/components/ui/read-only-field";
import { 
  BookmarkIcon, 
  BookOpen, 
  Calendar as CalendarIcon, 
  Check, 
  Edit2, 
  Pencil, 
  X, 
  AlertCircle, 
  Library, 
  Plus, 
  ChevronRight,
  ChevronLeft, 
  ChevronDown, 
  ChevronUp,
  Trash2, 
  AlertTriangle,
  Star,
  Database,
  Eye,
  EyeOff
} from "lucide-react";
import { createLogger } from "@/utils/loggingUtils";

// Create a logger for the BookDetails component
const log = createLogger('BookDetails');
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SeriesInfoPanel } from '@/components/series/SeriesInfoPanel';
import { SeriesAssignmentDialog } from '@/components/dialogs/SeriesAssignmentDialog';
import { CreateSeriesDialog } from '@/components/series/CreateSeriesDialog';
import BookCollectionAssignment from '@/components/BookCollectionAssignment';
import { cn } from "@/lib/utils";
import { cleanHtml } from "@/utils/textUtils";
import { format, parse, isValid } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { GenreDisplay } from "@/components/GenreDisplay";
import { genreToEditString, editStringToGenreArray } from "@/utils/genreUtils";
import { seriesService } from "@/services/SeriesService";
import { seriesApiService } from "@/services/api/SeriesApiService";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { enhancedStorageService } from "@/services/storage/EnhancedStorageService";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface BookDetailsProps {
  book: Book;
  onUpdate: (updatedBook: Book) => void;
  onDelete?: (bookId: string) => void;
  onClose: () => void;
}

export const BookDetails = ({ book, onUpdate, onDelete, onClose }: BookDetailsProps) => {
  const navigate = useNavigate();
  // State management
  const [editedBook, setEditedBook] = useState<Book>({ ...book });
  const [availableSeries, setAvailableSeries] = useState<Series[]>([]);
  const [loadingSeries, setLoadingSeries] = useState(false);
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>(book.seriesId || '');
  const [volumeNumber, setVolumeNumber] = useState<number | undefined>(book.volumeNumber);
  const [showSeriesInfo, setShowSeriesInfo] = useState(!!book.seriesId);
  
  // Log component initialization
  log.info('BookDetails component initialized', { 
    bookId: book.id,
    title: book.title,
    author: book.author,
    isInSeries: !!book.seriesId
  });
  
  // View/Edit mode toggle state
  const [isViewMode, setIsViewMode] = useState(true);
  
  // States for improved UI from main branch
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [isEditingAuthor, setIsEditingAuthor] = useState(false);
  const [authorError, setAuthorError] = useState<string | null>(null);
  const [isEditingPageCount, setIsEditingPageCount] = useState(false);
  const [pageCountError, setPageCountError] = useState<string | null>(null);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [descriptionInput, setDescriptionInput] = useState<string>(book.description || "");
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const [isEditingPublishedDate, setIsEditingPublishedDate] = useState(false);
  const [publishedDateInput, setPublishedDateInput] = useState<Date | undefined>(undefined);
  const [publishedDateError, setPublishedDateError] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [isEditingGenre, setIsEditingGenre] = useState(false);
  const [genreInput, setGenreInput] = useState<string>('');
  const [genreError, setGenreError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSeriesAssignmentDialog, setShowSeriesAssignmentDialog] = useState(false);
  const [showCreateSeriesDialog, setShowCreateSeriesDialog] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [showMetadataInfo, setShowMetadataInfo] = useState(false);
  const [showCollectionsInfo, setShowCollectionsInfo] = useState(true);
  const [seriesDetectionResult, setSeriesDetectionResult] = useState<any>(null);
  // Format date for HTML date input (YYYY-MM-DD)
  const formatDateForInput = (dateString?: string): string => {
    if (!dateString) return "";
    
    try {
      // Parse the date string
      const date = new Date(dateString);
      if (!isValid(date)) return "";
      
      // Format as YYYY-MM-DD
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error("Error formatting date for input:", error);
      return "";
    }
  };

  // Parse date from string
  const parseDate = (dateString?: string): Date | undefined => {
    if (!dateString) return undefined;
    
    try {
      // Try parsing in different formats
      const formats = ['yyyy-MM-dd', 'yyyy-MM', 'yyyy', 'MMMM d, yyyy'];
      let parsedDate: Date | undefined;
      
      // Try different formats
      for (const fmt of formats) {
        try {
          const date = parse(dateString, fmt, new Date());
          if (isValid(date)) {
            parsedDate = date;
            break;
          }
        } catch {
          // Continue to next format
        }
      }
      
      // Try direct Date parsing as fallback
      if (!parsedDate) {
        const date = new Date(dateString);
        if (isValid(date)) {
          parsedDate = date;
        }
      }
      
      return parsedDate;
    } catch (error) {
      console.error("Error parsing date:", error);
      return undefined;
    }
  };

  // Initialize the date input after parseDate is defined
  useEffect(() => {
    if (book.publishedDate) {
      setPublishedDateInput(parseDate(book.publishedDate));
    }
  }, [book.publishedDate]);
  
  // Focus and initialize genre input when editing starts
  useEffect(() => {
    if (isEditingGenre) {
      // Convert existing genre data to comma-separated string for editing
      log.debug('Initializing genre edit field', { bookId: book.id });
      const initialValue = genreToEditString(editedBook.genre);
      log.trace('Genre converted to edit string', { originalGenre: editedBook.genre, editString: initialValue });
      setGenreInput(initialValue);
      
      // Focus the input field
      setTimeout(() => {
        if (genreInputRef.current) {
          genreInputRef.current.focus();
        }
      }, 10);
    }
  }, [isEditingGenre, editedBook.genre, book.id]);
  
  const titleInputRef = useRef<HTMLInputElement>(null);
  const authorInputRef = useRef<HTMLInputElement>(null);
  const pageCountInputRef = useRef<HTMLInputElement>(null);
  const descriptionInputRef = useRef<HTMLTextAreaElement>(null);
  const genreInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Function to detect series and open the advanced dialog
  const detectAndOpenSeriesDialog = async () => {
    log.info('Detecting series for book', { 
      bookId: book.id, 
      title: book.title,
      author: book.author,
      hasGoogleId: !!book.googleBooksId
    });
    
    try {
      // If the book is already in a series, we'll use it as the current series
      // Otherwise, try to detect a series
      if (!book.seriesId) {
        log.debug('Calling series detection API', { 
          bookId: book.id,
          googleBooksId: book.googleBooksId || 'not available' 
        });
        
        const detectionResult = await seriesApiService.detectSeries(
          book.googleBooksId || '',
          book.title,
          book.author
        );
        
        if (detectionResult) {
          log.info('Series detection successful', { 
            bookId: book.id, 
            detectedSeries: detectionResult.series?.name || 'Unnamed series',
            detectionSource: detectionResult.source || 'unknown' 
          });
          setSeriesDetectionResult(detectionResult);
        } else {
          log.info('No series detected for book', { bookId: book.id });
        }
      }
      
      // Open the dialog
      setShowSeriesAssignmentDialog(true);
    } catch (error) {
      log.error('Error detecting series', { 
        bookId: book.id, 
        error: error.message || String(error),
        stack: error.stack
      });
      // Open the dialog anyway, just without detected series
      setShowSeriesAssignmentDialog(true);
    }
  };
  
  // Handle removing a book from series with database update
  const handleRemoveFromSeries = async () => {
    if (!book.seriesId) return;
    
    log.info('Removing book from series', { 
      bookId: book.id, 
      title: book.title, 
      seriesId: book.seriesId 
    });
    
    try {
      setIsSaving(true);
      
      // Initialize storage
      await enhancedStorageService.initialize();
      
      // First, update the series in IndexedDB
      const seriesInDb = await enhancedStorageService.getSeriesById(book.seriesId);
      if (seriesInDb) {
        // Update series books list
        const updatedSeriesForDb = {
          ...seriesInDb,
          books: seriesInDb.books.filter(id => id !== book.id),
          lastModified: new Date().toISOString()
        };
        
        await enhancedStorageService.saveSeries(updatedSeriesForDb);
        console.log('Updated series in IndexedDB:', updatedSeriesForDb.id);
      }
      
      // Update the book in IndexedDB to remove series association
      const bookInDb = await enhancedStorageService.getBookById(book.id);
      if (bookInDb) {
        const updatedBookForDb = {
          ...bookInDb,
          seriesId: undefined,
          isPartOfSeries: false,
          seriesPosition: undefined,
          lastModified: new Date().toISOString()
        };
        
        await enhancedStorageService.saveBook(updatedBookForDb);
        console.log('Updated book in IndexedDB, removed series association');
      }
      
      // Update UI state
      setSelectedSeriesId(null);
      
      // Update available series list in UI
      const updatedSeries = availableSeries.map(series => {
        if (series.id === book.seriesId) {
          return {
            ...series,
            books: series.books.filter(id => id !== book.id),
            updatedAt: new Date()
          };
        }
        return series;
      });
      setAvailableSeries(updatedSeries);
      
      // Call the parent's update function to update the book in the UI
      onUpdate({
        ...book,
        seriesId: undefined,
        isPartOfSeries: false,
        volumeNumber: undefined,
        seriesPosition: undefined
      });
      
      toast({
        title: "Series removed",
        description: "Book removed from series successfully",
      });
    } catch (error) {
      console.error('Error removing book from series:', error);
      toast({
        title: "Error",
        description: "Failed to remove book from series",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  // Handle series assignment from dialog
  const handleAssignSeries = (updatedBook: Book, seriesId: string, volumeNumber?: number) => {
    setSelectedSeriesId(seriesId);
    if (volumeNumber) {
      setVolumeNumber(volumeNumber);
    }
    setShowSeriesAssignmentDialog(false);
    toast({
      title: "Series Selected",
      description: "Series selection will be saved when you save the book."
    });
  };
  
  // Handle series creation from dialog
  const handleCreateNewSeries = async (seriesData: Partial<any>, bookToUpdate: Book, volumeNumber?: number) => {
    setIsSaving(true);
    try {
      // Initialize storage
      await enhancedStorageService.initialize();
      
      // Create a new series ID
      const newSeriesId = `series-${Date.now()}`;
      
      // Prepare series for IndexedDB (the only source of truth)
      const newSeriesForIndexedDB = {
        id: newSeriesId,
        name: seriesData.name || `Unknown Series`,
        description: seriesData.description || `Series featuring ${book.title}`,
        author: seriesData.author || book.author,
        books: [book.id],
        coverImage: seriesData.coverImage || book.thumbnail,
        // Convert genre to categories for IndexedDB format
        categories: seriesData.genre || (book.genre ? [book.genre] : []),
        status: seriesData.status || 'ongoing',
        readingOrder: 'publication' as 'publication' | 'chronological' | 'custom',
        totalBooks: seriesData.totalBooks || 1,
        completedBooks: 0,
        readingProgress: 0,
        isTracked: seriesData.isTracked || false,
        hasUpcoming: false,
        apiEnriched: false,
        dateAdded: new Date().toISOString(),
        lastModified: new Date().toISOString()
      };
      
      // Save the series to IndexedDB
      await enhancedStorageService.saveSeries(newSeriesForIndexedDB as any);
      console.log('New series saved to IndexedDB:', newSeriesId);
      
      // Update the book in IndexedDB to associate with this series
      const bookInDb = await enhancedStorageService.getBookById(book.id);
      if (bookInDb) {
        const updatedBook = {
          ...bookInDb,
          seriesId: newSeriesId,
          isPartOfSeries: true,
          seriesPosition: volumeNumber || 1,
          lastModified: new Date().toISOString()
        };
        await enhancedStorageService.saveBook(updatedBook);
        console.log('Book updated with series association in IndexedDB');
      }
      
      // Create a UI-friendly version of the series
      const newUISeriesObject = {
        ...newSeriesForIndexedDB,
        createdAt: new Date(),
        updatedAt: new Date(),
        // Copy categories to genre for UI compatibility
        genre: newSeriesForIndexedDB.categories
      };
      
      // Update local state
      const updatedSeries = [...availableSeries, newUISeriesObject];
      setAvailableSeries(updatedSeries);
      setSelectedSeriesId(newSeriesId);
      if (volumeNumber) {
        setVolumeNumber(volumeNumber);
      }
      
      // Close the dialog and show confirmation
      setShowSeriesAssignmentDialog(false);
      
      toast({
        title: "Series Created",
        description: `Series "${newSeriesForIndexedDB.name}" created with ${book.title}`
      });
      
      return newUISeriesObject;
    } catch (error) {
      console.error('Error creating series:', error);
      toast({
        title: "Error",
        description: "Failed to create series",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsSaving(false);
    }
  };
  
  // Load available series on component mount
  useEffect(() => {
    const loadSeries = async () => {
      setLoadingSeries(true);
      try {
        console.log('Loading series data from IndexedDB...');
        
        // Initialize the enhanced storage service
        await enhancedStorageService.initialize();
        
        // Get all series directly from IndexedDB - the only source of truth
        const seriesFromDB = await enhancedStorageService.getSeries();
        console.log(`Found ${seriesFromDB.length} series in IndexedDB`);
        
        if (seriesFromDB.length === 0) {
          console.log('No series found in the database');
          setAvailableSeries([]);
        } else {
          // Convert IndexedDB format to UI format
          const uiSeriesList = seriesFromDB.map(s => ({
            ...s,
            // Convert date strings to Date objects for UI
            createdAt: new Date(s.dateAdded || s.timestamps?.created || new Date().toISOString()),
            updatedAt: new Date(s.lastModified || s.timestamps?.updated || new Date().toISOString())
          }));
          
          console.log('Series loaded for UI:', uiSeriesList);
          setAvailableSeries(uiSeriesList);
        }
      } catch (error) {
        console.error('Error loading series from IndexedDB:', error);
        setAvailableSeries([]);
      } finally {
        setLoadingSeries(false);
      }
    };
    
    loadSeries();
  }, []);

  // Enhanced save handler with loading state
  const handleSave = useCallback(async () => {
    if (isSaving) return;
    
    log.info('Saving book changes', {
      bookId: book.id,
      title: editedBook.title,
      hasSeriesChanges: book.seriesId !== selectedSeriesId
    });
    
    setIsSaving(true);
    
    try {
      // Update book with series information, title, author, and page count
      const titleToUse = titleInputRef.current?.value.trim() || editedBook.title;
      const authorToUse = authorInputRef.current?.value.trim() || editedBook.author;
      
      // Process page count (preserve undefined if empty)
      let pageCountToUse = editedBook.pageCount;
      if (pageCountInputRef.current) {
        const pageCountValue = pageCountInputRef.current.value.trim();
        pageCountToUse = pageCountValue ? parseInt(pageCountValue, 10) : undefined;
      }
      
      log.debug('Processed form values', {
        bookId: book.id,
        title: titleToUse,
        titleChanged: titleToUse !== book.title,
        author: authorToUse,
        authorChanged: authorToUse !== book.author,
        pageCount: pageCountToUse,
        pageCountChanged: pageCountToUse !== book.pageCount
      });
      
      const updatedBook: Book = {
        ...editedBook,
        title: titleToUse,
        author: authorToUse,
        pageCount: pageCountToUse,
        isPartOfSeries: !!selectedSeriesId,
        seriesId: selectedSeriesId || undefined,
        volumeNumber: volumeNumber,
        seriesPosition: volumeNumber // Set both for compatibility
      };
      
      // If a series was selected, make sure the book is added to that series
      if (selectedSeriesId) {
        try {
          // First update using seriesService (which now updates IndexedDB - exclusive source of truth)
          await seriesService.addBookToSeries(selectedSeriesId, book.id);
          
          // Also update directly in IndexedDB for data consistency
          try {
            await enhancedStorageService.initialize();
            await enhancedStorageService.addBookToSeries(book.id, selectedSeriesId, volumeNumber);
          } catch (indexedDBError) {
            console.error('Error updating book-series relationship in IndexedDB:', indexedDBError);
            // Continue even if IndexedDB update fails - we'll still update the UI
          }
          
          toast({
            title: "Series Updated",
            description: "Book successfully added to series."
          });
        } catch (error) {
          console.error('Error adding book to series:', error);
          toast({
            title: "Error",
            description: "Failed to add book to series.",
            variant: "destructive"
          });
        }
      }

      // First call parent update to update UI state
      onUpdate(updatedBook);

      // Then also save to IndexedDB in the background for data persistence
      try {
        await enhancedStorageService.initialize();

        // Convert to IndexedDB format and save
        const enhancedBook = {
          ...updatedBook,
          // Add required IndexedDB fields
          dateAdded: updatedBook.addedDate,
          lastModified: new Date().toISOString(),
          // Add reading progress if not present
          progress: (updatedBook as any).progress || 0
        };

        await enhancedStorageService.saveBook(enhancedBook as any);
        log.info('Book saved to IndexedDB successfully', {
          bookId: book.id,
          title: updatedBook.title,
          lastModified: new Date().toISOString()
        });
      } catch (indexedDBError) {
        log.error('Error saving book to IndexedDB', {
          bookId: book.id,
          error: indexedDBError.message || String(indexedDBError)
        });
        // Continue even if IndexedDB update fails - we'll still update the UI
      }

      // Close the dialog
      onClose();

      toast({
        title: "Changes Saved",
        description: "Book details updated successfully."
      });
    } catch (error) {
      log.error('Error saving book changes', {
        bookId: book.id, 
        error: error.message || String(error),
        stack: error.stack
      });
      toast({
        title: "Error",
        description: "Failed to save changes. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
      log.debug('Save operation completed', { bookId: book.id });
    }
  }, [editedBook, isSaving, onUpdate, onClose, selectedSeriesId, toast]);

  // Delete confirmation and handling
  const handleDeleteConfirmation = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    log.info('Book delete confirmation requested', { bookId: book.id, title: book.title });
    setShowDeleteConfirm(true);
  }, [book.id, book.title]);
  
  const confirmDelete = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (isDeleting || !onDelete) return;
    
    log.info('Deleting book', { bookId: book.id, title: book.title });
    setIsDeleting(true);
    
    try {
      onDelete(book.id);
      setShowDeleteConfirm(false);
      
      toast({
        title: "Book Deleted",
        description: "The book has been removed from your collection."
      });
    } catch (error) {
      console.error('Error deleting book:', error);
      toast({
        title: "Error",
        description: "Failed to delete book. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  }, [book.id, isDeleting, onDelete, toast]);

  // Title editing functions
  const startTitleEdit = useCallback(() => {
    log.debug('Starting title edit', { bookId: book.id, currentTitle: editedBook.title });
    setIsEditingTitle(true);
    setTitleError(null);
    // Focus the input after state update
    setTimeout(() => {
      if (titleInputRef.current) {
        titleInputRef.current.focus();
        titleInputRef.current.select();
      }
    }, 10);
  }, [book.id, editedBook.title]);
  
  // Author editing function
  const startAuthorEdit = useCallback(() => {
    log.debug('Starting author edit', { bookId: book.id, currentAuthor: editedBook.author });
    setIsEditingAuthor(true);
    setAuthorError(null);
    // Focus the input after state update
    setTimeout(() => {
      if (authorInputRef.current) {
        authorInputRef.current.focus();
        authorInputRef.current.select();
      }
    }, 10);
  }, [book.id, editedBook.author]);
  
  const validateAndSaveTitle = useCallback(() => {
    const newTitle = titleInputRef.current?.value.trim();
    
    log.debug('Validating title', { bookId: book.id, newTitle });
    
    if (!newTitle) {
      log.warn('Empty title validation failed', { bookId: book.id });
      setTitleError("Title cannot be empty");
      return false;
    }
    
    setEditedBook(prev => {
      log.info('Title updated', { 
        bookId: book.id, 
        oldTitle: prev.title, 
        newTitle 
      });
      return { ...prev, title: newTitle };
    });
    setIsEditingTitle(false);
    setTitleError(null);
    return true;
  }, [book.id]);
  
  const validateAndSaveAuthor = useCallback(() => {
    const newAuthor = authorInputRef.current?.value.trim();
    
    if (!newAuthor) {
      setAuthorError("Author cannot be empty");
      return false;
    }
    
    setEditedBook(prev => ({ ...prev, author: newAuthor }));
    setIsEditingAuthor(false);
    setAuthorError(null);
    return true;
  }, []);
  
  // Page count validation and saving
  const validateAndSavePageCount = useCallback(() => {
    const newPageCount = pageCountInputRef.current?.value.trim();
    
    log.debug('Validating page count', { bookId: book.id, newPageCount });
    
    // Allow empty string (optional field)
    if (!newPageCount) {
      log.debug('Empty page count - setting to undefined', { bookId: book.id });
      setEditedBook(prev => ({ ...prev, pageCount: undefined }));
      setIsEditingPageCount(false);
      setPageCountError(null);
      return true;
    }
    
    // Parse input to number
    const numValue = parseInt(newPageCount, 10);
    
    // Check if it's a valid positive integer
    if (isNaN(numValue) || numValue <= 0 || !Number.isInteger(numValue)) {
      log.warn('Invalid page count format', { 
        bookId: book.id, 
        attemptedValue: newPageCount, 
        parsedValue: numValue 
      });
      setPageCountError("Page count must be a positive whole number");
      return false;
    }
    
    setEditedBook(prev => {
      log.info('Page count updated', { 
        bookId: book.id, 
        oldPageCount: prev.pageCount, 
        newPageCount: numValue 
      });
      return { ...prev, pageCount: numValue };
    });
    setIsEditingPageCount(false);
    setPageCountError(null);
    return true;
  }, [book.id]);
  
  const cancelTitleEdit = useCallback(() => {
    if (titleInputRef.current) {
      titleInputRef.current.value = editedBook.title;
    }
    setIsEditingTitle(false);
    setTitleError(null);
  }, [editedBook.title]);
  
  const cancelAuthorEdit = useCallback(() => {
    if (authorInputRef.current) {
      authorInputRef.current.value = editedBook.author;
    }
    setIsEditingAuthor(false);
    setAuthorError(null);
  }, [editedBook.author]);
  
  const cancelPageCountEdit = useCallback(() => {
    if (pageCountInputRef.current) {
      pageCountInputRef.current.value = editedBook.pageCount?.toString() || '';
    }
    setIsEditingPageCount(false);
    setPageCountError(null);
  }, [editedBook.pageCount]);
  
  const handleTitleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      validateAndSaveTitle();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelTitleEdit();
    }
  }, [validateAndSaveTitle, cancelTitleEdit]);
  
  const handleAuthorKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      validateAndSaveAuthor();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelAuthorEdit();
    }
  }, [validateAndSaveAuthor, cancelAuthorEdit]);
  
  const handlePageCountKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      validateAndSavePageCount();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelPageCountEdit();
    }
  }, [validateAndSavePageCount, cancelPageCountEdit]);
  
  // Validate and save description
  const validateAndSaveDescription = useCallback(() => {
    // Description is optional, so empty is fine
    const newDescription = descriptionInput.trim();
    
    // Update the book with sanitized description (or undefined if empty)
    setEditedBook(prev => ({
      ...prev,
      description: newDescription || undefined
    }));
    
    // Exit editing mode
    setIsEditingDescription(false);
    setDescriptionError(null);
    return true;
  }, [descriptionInput]);
  
  // Cancel description edit
  const cancelDescriptionEdit = useCallback(() => {
    // Reset to the original description
    setDescriptionInput(editedBook.description || "");
    setDescriptionError(null);
    setIsEditingDescription(false);
  }, [editedBook.description]);
  
  // Validate genre input
  const validateGenreInput = (input: string): boolean => {
    // Genre is optional, so empty is valid
    log.debug('Validating genre input', { input });
    setGenreError(null);
    return true;
  };
  
  // Save genre changes
  const validateAndSaveGenre = useCallback(() => {
    log.debug('Saving genre changes', { bookId: book.id });
    if (!validateGenreInput(genreInput)) {
      log.warn('Genre validation failed', { bookId: book.id });
      return false;
    }
    
    // Convert input to array format
    const genreArray = editStringToGenreArray(genreInput);
    log.trace('Converted genre edit string to array', { 
      genreInput,
      genreArray,
      count: genreArray.length 
    });
    
    // Update edited book with new genre value (join as string or undefined if empty)
    setEditedBook(prev => {
      const newGenre = genreArray.length > 0 ? genreArray.join(', ') : undefined;
      log.info('Updating book genres', { 
        bookId: book.id,
        oldGenre: prev.genre, 
        newGenre,
        genreCount: genreArray.length 
      });
      return {
        ...prev,
        // Convert array to string or leave as undefined if empty
        genre: newGenre
      };
    });
    
    // Exit editing mode
    setIsEditingGenre(false);
    setGenreError(null);
    return true;
  }, [genreInput, book.id]);
  
  // Cancel genre editing
  const cancelGenreEdit = useCallback(() => {
    // Reset to the original genre
    log.debug('Cancelling genre edit', { bookId: book.id });
    setGenreInput(genreToEditString(editedBook.genre));
    setGenreError(null);
    setIsEditingGenre(false);
  }, [editedBook.genre, book.id]);
  

  
  // Format date for display
  const formatPublishedDate = (date?: Date | string): string => {
    if (!date) return "Unknown";
    
    try {
      const dateObj = typeof date === 'string' ? parseDate(date) : date;
      if (!dateObj || !isValid(dateObj)) return "Invalid date";
      
      return format(dateObj, 'MMMM d, yyyy');
    } catch {
      return String(date);
    }
  };
  
  // Validate and save published date
  const validateAndSavePublishedDate = useCallback(() => {
    // Date is optional, so undefined is valid
    if (!publishedDateInput) {
      setEditedBook(prev => ({ ...prev, publishedDate: undefined }));
      setIsEditingPublishedDate(false);
      setPublishedDateError(null);
      return true;
    }
    
    // Check if it's a valid date
    if (!isValid(publishedDateInput)) {
      setPublishedDateError("Invalid date format");
      return false;
    }
    
    // Format the date for storage
    const formattedDate = format(publishedDateInput, 'yyyy-MM-dd');
    setEditedBook(prev => ({ ...prev, publishedDate: formattedDate }));
    
    // Exit editing mode
    setIsEditingPublishedDate(false);
    setCalendarOpen(false);
    setPublishedDateError(null);
    return true;
  }, [publishedDateInput]);
  
  // Cancel published date edit
  const cancelPublishedDateEdit = useCallback(() => {
    // Reset to the original date
    setPublishedDateInput(
      editedBook.publishedDate ? parseDate(editedBook.publishedDate) : undefined
    );
    setPublishedDateError(null);
    setIsEditingPublishedDate(false);
    setCalendarOpen(false);
  }, [editedBook.publishedDate]);
  
  // Rating click handler
  const handleRatingClick = (rating: number) => {
    setEditedBook({ ...editedBook, rating });
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      // If in edit mode or delete confirmation is open, don't trigger global shortcuts
      if (isEditingTitle || isEditingAuthor || isEditingPageCount || isEditingDescription || isEditingPublishedDate || isEditingGenre || showDeleteConfirm) return;
      
      // Ctrl/Cmd + S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      
      // Escape to close
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    
    // Add event listener
    window.addEventListener('keydown', handleKeyDown);
    
    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleSave, onClose, isEditingTitle, isEditingAuthor, isEditingPageCount, isEditingDescription, isEditingPublishedDate, isEditingGenre, showDeleteConfirm]);

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-elegant">
        <CardHeader className="bg-gradient-warm text-primary-foreground">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {isViewMode ? (
                <CardTitle className="text-2xl font-serif text-wrap">
                  {editedBook.title}
                </CardTitle>
              ) : isEditingTitle ? (
                <div className="relative mb-2">
                  <div className="sr-only" id="title-instructions">
                    Edit book title. Press Enter to save or Escape to cancel.
                  </div>
                  <label htmlFor="book-title-input" className="sr-only">Book title</label>
                  <Input
                    id="book-title-input"
                    ref={titleInputRef}
                    defaultValue={editedBook.title}
                    className={cn(
                      "font-serif text-lg bg-white/20 text-primary-foreground border-white/30",
                      titleError && "border-destructive focus-visible:ring-destructive"
                    )}
                    autoFocus
                    onKeyDown={handleTitleKeyDown}
                    aria-invalid={!!titleError}
                    aria-describedby="title-instructions"
                    aria-errormessage={titleError ? "title-error" : undefined}
                  />
                  {titleError && (
                    <div 
                      id="title-error"
                      className="text-destructive text-sm flex items-center gap-1 mt-1"
                      role="alert"
                    >
                      <AlertCircle className="h-3 w-3" aria-hidden="true" /> {titleError}
                    </div>
                  )}
                  <div className="absolute right-1 top-1 flex gap-1" aria-hidden="true">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={(e) => {
                        e.preventDefault();
                        cancelTitleEdit();
                      }}
                      className="h-7 w-7 p-0"
                      aria-label="Cancel title edit"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={(e) => {
                        e.preventDefault();
                        validateAndSaveTitle();
                      }}
                      className="h-7 w-7 p-0"
                      aria-label="Save title"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <CardTitle 
                  className="text-2xl font-serif text-wrap cursor-pointer" 
                  onClick={() => setIsEditingTitle(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setIsEditingTitle(true);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label="Edit book title"
                >
                  {editedBook.title}
                  <Edit2 className="h-4 w-4 ml-2 opacity-50" />
                </CardTitle>
              )}
              {isViewMode ? (
                <div className="font-serif text-base">
                  by {editedBook.author}
                </div>
              ) : isEditingAuthor ? (
                <div className="relative mb-2">
                  <div className="sr-only" id="author-instructions">
                    Edit book author. Press Enter to save or Escape to cancel.
                  </div>
                  <label htmlFor="book-author-input" className="sr-only">Book author</label>
                  <Input
                    id="book-author-input"
                    ref={authorInputRef}
                    defaultValue={editedBook.author}
                    className={cn(
                      "font-medium bg-white/20 text-primary-foreground border-white/30",
                      authorError && "border-destructive focus-visible:ring-destructive"
                    )}
                    autoFocus
                    onKeyDown={handleAuthorKeyDown}
                    aria-invalid={!!authorError}
                  />
                  {authorError && (
                    <div className="text-destructive text-sm flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3 w-3" /> {authorError}
                    </div>
                  )}
                  <div className="absolute right-1 top-1 flex gap-1">
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        validateAndSaveAuthor();
                      }}
                      className="h-7 w-7 p-0 text-primary-foreground hover:bg-white/20"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        cancelAuthorEdit();
                      }}
                      className="h-7 w-7 p-0 text-primary-foreground hover:bg-white/20"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <p 
                  className="text-primary-foreground/90 font-medium cursor-pointer hover:underline hover:underline-offset-4 flex items-center" 
                  onClick={startAuthorEdit}
                >
                  by {editedBook.author}
                  <Edit2 className="h-4 w-4 ml-2 opacity-50" />
                </p>
              )}
              <div className="mt-2 relative">
                {isViewMode ? (
                  <ReadOnlyField 
                    label="Genre"
                    value={editedBook.genre ? <GenreDisplay genres={editedBook.genre} /> : "No genre specified"}
                    icon={<BookmarkIcon className="h-4 w-4 mr-2" />}
                  />
                ) : isEditingGenre ? (
                  <div className="relative flex-grow">
                    <div className="sr-only" id="genre-instructions">
                      Enter book genres separated by commas. Press Enter to save or Escape to cancel.
                    </div>
                    <label htmlFor="genre-input" className="sr-only">Book genres</label>
                    <Input
                      id="genre-input"
                      ref={genreInputRef}
                      value={genreInput}
                      onChange={(e) => {
                        setGenreInput(e.target.value);
                        validateGenreInput(e.target.value);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          validateAndSaveGenre();
                        } else if (e.key === 'Escape') {
                          e.preventDefault();
                          cancelGenreEdit();
                        }
                      }}
                      placeholder="Fiction, Fantasy, Mystery..."
                      aria-describedby="genre-instructions genre-helper-text"
                      aria-invalid={!!genreError}
                      aria-errormessage={genreError ? "genre-error" : undefined}
                      className={cn(
                        "text-foreground dark:text-foreground",
                        genreError ? "border-destructive focus-visible:ring-destructive" : ""
                      )}
                    />
                    {genreError && (
                      <div 
                        id="genre-error"
                        className="text-destructive text-sm flex items-center gap-1 mt-1"
                        role="alert"
                      >
                        <AlertCircle className="h-3 w-3" aria-hidden="true" /> {genreError}
                      </div>
                    )}
                    <div id="genre-helper-text" className="text-xs text-muted-foreground mt-1">
                      Enter genres separated by commas
                    </div>
                    <div className="absolute right-1 top-1 flex gap-1" aria-hidden="true">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          cancelGenreEdit();
                        }}
                        className="h-7 w-7 p-0"
                        aria-label="Cancel editing genres"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          validateAndSaveGenre();
                        }}
                        className="h-7 w-7 p-0"
                        aria-label="Save genres"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div 
                    className="cursor-pointer hover:underline hover:underline-offset-4"
                    onClick={() => setIsEditingGenre(true)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setIsEditingGenre(true);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label="Edit book genres"
                  >
                    <div className="flex items-center">
                      <GenreDisplay genres={editedBook.genre} />
                      <Edit2 className="h-4 w-4 ml-2 opacity-50" aria-hidden="true" />
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsViewMode(!isViewMode)}
                className="text-primary-foreground hover:bg-white/20"
                aria-label={isViewMode ? "Switch to edit mode" : "Switch to view mode"}
                title={isViewMode ? "Switch to edit mode" : "Switch to view mode"}
              >
                {isViewMode ? (
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-primary-foreground hover:bg-white/20"
                aria-label="Close book details"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Book Cover and Basic Info */}
          <div className="flex gap-4">
            {book.thumbnail && (
              <img
                src={book.thumbnail}
                alt={book.title}
                className="w-24 h-36 object-cover rounded shadow-book"
              />
            )}
            <div className="flex-1 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                {isViewMode ? (
                  <span className="text-sm">
                    {editedBook.publishedDate ? 
                      `Published: ${formatPublishedDate(editedBook.publishedDate)}` : 
                      "Publication date not set"}
                  </span>
                ) : isEditingPublishedDate ? (
                  <div className="relative flex-grow">
                    <div className="sr-only" id="publisheddate-instructions">
                      Edit book publication date. Use the calendar to select a date or press Escape to cancel.
                    </div>
                    <label id="published-date-label" className="sr-only">Book publication date</label>
                    <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-[240px] justify-start text-left font-normal",
                            !publishedDateInput && "text-muted-foreground",
                            publishedDateError && "border-destructive focus-visible:ring-destructive"
                          )}
                          aria-labelledby="published-date-label"
                          aria-describedby="publisheddate-instructions"
                          aria-invalid={!!publishedDateError}
                          aria-errormessage={publishedDateError ? "publisheddate-error" : undefined}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" aria-hidden="true" />
                          {publishedDateInput ? formatPublishedDate(publishedDateInput) : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={publishedDateInput}
                          onSelect={(date: Date | undefined) => {
                            setPublishedDateInput(date);
                            if (date) {
                              // Auto-close calendar on selection
                              setTimeout(() => setCalendarOpen(false), 300);
                            }
                          }}
                          initialFocus
                          aria-label="Select publication date"
                        />
                        <div className="flex justify-end gap-2 p-3 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setPublishedDateInput(undefined);
                              setCalendarOpen(false);
                            }}
                            aria-label="Clear publication date"
                          >
                            Clear
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => {
                              validateAndSavePublishedDate();
                            }}
                            aria-label="Save publication date"
                          >
                            Done
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                    {publishedDateError && (
                      <div 
                        id="publisheddate-error"
                        className="text-destructive text-sm flex items-center gap-1 mt-1"
                        role="alert"
                      >
                        <AlertCircle className="h-3 w-3" aria-hidden="true" /> {publishedDateError}
                      </div>
                    )}
                    <div className="absolute right-1 top-1 flex gap-1" aria-hidden="true">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          cancelPublishedDateEdit();
                        }}
                        className="h-7 w-7 p-0"
                        aria-label="Cancel date edit"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <span 
                    className="cursor-pointer hover:underline hover:underline-offset-4 flex items-center"
                    onClick={() => setIsEditingPublishedDate(true)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setIsEditingPublishedDate(true);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label="Edit publication date"
                  >
                    {editedBook.publishedDate ? 
                      `Published: ${formatPublishedDate(editedBook.publishedDate)}` : 
                      "Add publication date"}
                    <Edit2 className="h-4 w-4 ml-2 opacity-50" aria-hidden="true" />
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                {isViewMode ? (
                  <span className="text-sm">
                    {editedBook.pageCount ? `${editedBook.pageCount} pages` : 'No page count'}
                  </span>
                ) : isEditingPageCount ? (
                  <div className="relative flex-grow">
                    <div className="sr-only" id="pagecount-instructions">
                      Edit book page count. Enter a positive whole number. Press Enter to save or Escape to cancel.
                    </div>
                    <label htmlFor="book-pagecount-input" className="sr-only">Book page count</label>
                    <Input
                      id="book-pagecount-input"
                      ref={pageCountInputRef}
                      type="number"
                      min="1"
                      step="1"
                      defaultValue={editedBook.pageCount?.toString() || ''}
                      className={cn(
                        "max-w-[150px] bg-background",
                        pageCountError && "border-destructive focus-visible:ring-destructive"
                      )}
                      autoFocus
                      onKeyDown={handlePageCountKeyDown}
                      aria-describedby="pagecount-instructions"
                      aria-invalid={!!pageCountError}
                      aria-errormessage={pageCountError ? "pagecount-error" : undefined}
                    />
                    {pageCountError && (
                      <div 
                        id="pagecount-error"
                        className="text-destructive text-sm flex items-center gap-1 mt-1"
                        role="alert"
                      >
                        <AlertCircle className="h-3 w-3" aria-hidden="true" /> {pageCountError}
                      </div>
                    )}
                    <div className="absolute right-1 top-1 flex gap-1" aria-hidden="true">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          cancelPageCountEdit();
                        }}
                        className="h-7 w-7 p-0"
                        aria-label="Cancel page count edit"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          validateAndSavePageCount();
                        }}
                        className="h-7 w-7 p-0"
                        aria-label="Save page count"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p 
                    className="cursor-pointer hover:underline hover:underline-offset-4 flex gap-2 items-center" 
                    onClick={() => setIsEditingPageCount(true)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setIsEditingPageCount(true);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label="Edit book page count"
                  >
                    {editedBook.pageCount ? `${editedBook.pageCount} pages` : 'No page count'} <Edit2 className="h-4 w-4 opacity-50" aria-hidden="true" />
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Reading Progress */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="readingStatus">Reading Status</Label>
              {isViewMode ? (
                <div className="p-2 border rounded-md bg-muted text-foreground">
                  {editedBook.status === 'reading' && 'Currently Reading'}
                  {editedBook.status === 'completed' && 'Completed'}
                  {editedBook.status === 'want-to-read' && 'Want to Read'}
                  {editedBook.status === 'dnf' && 'Did Not Finish'}
                  {editedBook.status === 'on-hold' && 'On Hold'}
                  {!editedBook.status && (editedBook.completedDate ? 'Completed' : 'Currently Reading')}
                </div>
              ) : (
                <>
                  <div className="sr-only" id="status-description">
                    Select the current reading status for this book. Selecting 'Completed' will automatically set today's date as completion date if none exists.
                  </div>
                  <select
                    id="readingStatus"
                    value={editedBook.status || (editedBook.completedDate ? 'completed' : 'reading')}
                    onChange={(e) => {
                      const status = e.target.value as 'reading' | 'completed' | 'want-to-read' | 'dnf';
                      // If changing to completed, set today as completion date if none exists
                      // If changing away from completed, clear completion date
                      const completedDate = status === 'completed' 
                        ? (editedBook.completedDate || new Date().toISOString().split('T')[0])
                        : (status === 'reading' ? editedBook.completedDate : undefined);
                      
                      setEditedBook({ ...editedBook, status, completedDate });
                    }}
                    className="w-full p-2 border rounded-md bg-background text-foreground"
                    aria-describedby="status-description"
                  >
                    <option value="want-to-read">Want to Read</option>
                    <option value="reading">Currently Reading</option>
                    <option value="on-hold">On Hold</option>
                    <option value="completed">Completed</option>
                    <option value="dnf">Did Not Finish</option>
                  </select>
                </>
              )}  
            </div>
            
            <div>
              <Label htmlFor="completedDate">Completed Date</Label>
              {isViewMode ? (
                <div className="p-2 border rounded-md bg-muted text-foreground">
                  {editedBook.completedDate ? formatDateForInput(editedBook.completedDate) : 'Not completed yet'}
                </div>
              ) : (
                <>
                  <div className="sr-only" id="completeddate-description">
                    Select the date when you finished reading this book. Only available for books marked as completed or currently reading.
                  </div>
                  <Input
                    id="completedDate"
                    type="date"
                    value={formatDateForInput(editedBook.completedDate) || ""}
                    disabled={editedBook.status === 'want-to-read'}
                    onChange={(e) =>
                      setEditedBook({ ...editedBook, completedDate: e.target.value })
                    }
                    aria-describedby="completeddate-description"
                    aria-disabled={editedBook.status === 'want-to-read'}
                    aria-labelledby="completedDateLabel"
                  />
                </>
              )}
            </div>

            <div>
              <Label id="rating-label">Rating</Label>
              <div className="sr-only" id="rating-description">
                {isViewMode ? 'Book rating on a scale of 1 to 5 stars.' : 'Rate this book from 1 to 5 stars. Click on a star to set your rating.'}
              </div>
              <div 
                className={cn(
                  "flex gap-1 mt-1",
                  isViewMode ? "pointer-events-none" : ""
                )}
                role="radiogroup"
                aria-labelledby="rating-label"
                aria-describedby="rating-description"
              >
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={cn(
                      "h-6 w-6 transition-colors",
                      !isViewMode && "cursor-pointer",
                      star <= (editedBook.rating || 0)
                        ? "fill-accent-warm text-accent-warm"
                        : "text-muted-foreground"
                    )}
                    onClick={() => !isViewMode && setEditedBook({ ...editedBook, rating: star })}
                    onKeyDown={(e) => {
                      if (!isViewMode && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        setEditedBook({ ...editedBook, rating: star });
                      }
                    }}
                    role={isViewMode ? "img" : "radio"}
                    aria-checked={!isViewMode && star === editedBook.rating}
                    aria-label={`${star} star${star !== 1 ? 's' : ''}`}
                    tabIndex={isViewMode ? -1 : 0}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes</Label>
            {isViewMode ? (
              <div className="text-sm mt-1 p-3 bg-muted rounded leading-relaxed min-h-[100px] overflow-y-auto scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
                {editedBook.notes ? (
                  <div className="whitespace-pre-line">{editedBook.notes}</div>
                ) : (
                  <div className="text-muted-foreground italic">No notes available.</div>
                )}
              </div>
            ) : (
              <Textarea
                id="notes"
                placeholder="Your thoughts about this book..."
                value={editedBook.notes || ""}
                onChange={(e) =>
                  setEditedBook({ ...editedBook, notes: e.target.value })
                }
                className="min-h-[100px]"
              />
            )}
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="book-description">Description</Label>
            {isViewMode ? (
              <div className="text-sm mt-1 p-3 bg-muted rounded leading-relaxed max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
                {editedBook.description ? (
                  <div className="whitespace-pre-line">{cleanHtml(editedBook.description)}</div>
                ) : (
                  <div className="text-muted-foreground italic">No description available.</div>
                )}
              </div>
            ) : isEditingDescription ? (
              <div className="mt-1">
                <div className="sr-only" id="description-instructions">
                  Edit book description. You can add rich text or basic formatting. Press Enter to create paragraphs.
                </div>
                <Textarea
                  id="book-description"
                  ref={descriptionInputRef}
                  value={descriptionInput}
                  onChange={(e) => setDescriptionInput(e.target.value)}
                  className={cn(
                    "min-h-[120px] bg-background",
                    descriptionError && "border-destructive focus-visible:ring-destructive"
                  )}
                  placeholder="Add a description..."
                  rows={6}
                  autoFocus
                  aria-describedby="description-instructions"
                  aria-invalid={!!descriptionError}
                  aria-errormessage={descriptionError ? "description-error" : undefined}
                />
                {descriptionError && (
                  <div 
                    id="description-error"
                    className="text-destructive text-sm flex items-center gap-1 mt-1"
                    role="alert"
                  >
                    <AlertCircle className="h-3 w-3" aria-hidden="true" /> {descriptionError}
                  </div>
                )}
                <div className="flex justify-end gap-2 mt-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      cancelDescriptionEdit();
                    }}
                    aria-label="Cancel description edit"
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      validateAndSaveDescription();
                    }}
                    aria-label="Save book description"
                  >
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <div 
                className="text-sm mt-1 p-3 bg-muted rounded leading-relaxed max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent relative cursor-pointer hover:bg-muted/80 group"
                onClick={() => setIsEditingDescription(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setIsEditingDescription(true);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label="Edit book description"
              >
                {editedBook.description ? (
                  <div className="whitespace-pre-line">{cleanHtml(editedBook.description)}</div>
                ) : (
                  <div className="text-muted-foreground italic">No description available. Click to add one.</div>
                )}
                <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true">
                  <Edit2 className="h-4 w-4 text-muted-foreground" />
                </div>
                {/* Fade effect at the bottom to indicate scrollable content */}
                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-muted to-transparent pointer-events-none"></div>
              </div>
            )}
          </div>
          
          {/* Series Information */}
          <div className="space-y-3">
            <div 
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setShowSeriesInfo(!showSeriesInfo)}
            >
              <div className="flex items-center gap-2">
                <Library className="h-5 w-5 text-primary" />
                <h3 className="text-base font-medium">Series Information</h3>
              </div>
              <Button variant="ghost" size="sm" className="p-1 h-8 w-8">
                {showSeriesInfo ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
            
            {showSeriesInfo && (
              <div className="bg-muted/30 p-4 rounded-md border">
                {isViewMode ? (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2 text-sm">Series</h4>
                      <div className="p-2 border rounded-md bg-muted text-foreground">
                        {selectedSeriesId ? (
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex items-center gap-1.5 bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary hover:text-primary-foreground transition-all duration-200 shadow-sm hover:shadow"
                                onClick={() => navigate(`/series/${selectedSeriesId}`)}
                              >
                                <BookOpen className="h-3.5 w-3.5" />
                                <span>
                                  {availableSeries.find(s => s.id === selectedSeriesId)?.name || 'Loading series...'}
                                  {availableSeries.find(s => s.id === selectedSeriesId)?.author && 
                                    ` (${availableSeries.find(s => s.id === selectedSeriesId)?.author})`}
                                  {volumeNumber && ` - Volume ${volumeNumber}`}
                                </span>
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2">
                            <div className="text-muted-foreground">Not part of a series</div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-[180px]"
                              onClick={() => detectAndOpenSeriesDialog()}
                            >
                              Manage Series
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mb-4">
                    <Label htmlFor="seriesSelect">Add to Series</Label>
                    {loadingSeries ? (
                      <Skeleton className="h-10 w-full mt-1" />
                    ) : (
                      <div className="relative">
                        {/* Fallback to using a standard select as a temporary solution */}
                        <select
                          id="seriesSelect"
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring appearance-none"
                          value={selectedSeriesId}
                          onChange={(e) => {
                            if (e.target.value === "advanced") {
                              // Open SeriesAssignmentDialog with series detection
                              detectAndOpenSeriesDialog();
                            } else {
                              setSelectedSeriesId(e.target.value);
                            }
                          }}
                        >
                          <option value="">None</option>
                          {availableSeries.map(series => (
                            <option key={series.id} value={series.id}>
                              {series.name} {series.author && `(${series.author})`}
                            </option>
                          ))}
                          {/* Advanced series selection disabled pending improved implementation */}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                )}
                
                {selectedSeriesId && !isViewMode && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="volumeNumber">Volume in Series</Label>
                      <Input
                        id="volumeNumber"
                        type="number"
                        min="1"
                        placeholder="Volume number"
                        value={volumeNumber || ''}
                        onChange={(e) => setVolumeNumber(parseInt(e.target.value) || undefined)}
                        className="mt-1"
                      />
                    </div>
                    
                    {/* Enhanced Series Information Display */}
                    <div className="mt-4 pt-4 border-t border-border/40">
                      <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                        <Library className="h-4 w-4 text-primary" />
                        Series Details
                      </h4>
                      
                      <SeriesInfoPanel 
                        seriesId={selectedSeriesId} 
                        currentBookId={book.id} 
                        volumeNumber={volumeNumber} 
                      />
                    </div>
                    
                    <div className="flex items-center justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-destructive"
                        onClick={(e) => {
                          e.preventDefault();
                          setShowRemoveConfirm(true); // Show confirmation dialog
                        }}
                      >
                        Remove from Series
                        <X className="ml-1 h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
                
                {!selectedSeriesId && !isViewMode && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center mt-2"
                    onClick={() => {
                      setShowCreateSeriesDialog(true);
                    }}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Create New Series
                  </Button>
                )}
                
                {/* Legacy fields - hidden but preserved for data migration */}
                <input 
                  type="hidden" 
                  value={editedBook._legacySeriesName || ''}
                />
                <input 
                  type="hidden" 
                  value={editedBook._legacyNextBookTitle || ''}
                />
                <input 
                  type="hidden" 
                  value={editedBook._legacyNextBookExpectedYear || ''}
                />
              </div>
            )}
          </div>

          {/* Collections */}
          <div className="space-y-3 mt-4">
            <div 
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setShowCollectionsInfo(!showCollectionsInfo)}
            >
              <div className="flex items-center gap-2">
                <BookmarkIcon className="h-5 w-5 text-primary" />
                <h3 className="text-base font-medium">Collections</h3>
              </div>
              <Button variant="ghost" size="sm" className="p-1 h-8 w-8">
                {showCollectionsInfo ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
            
            {showCollectionsInfo && (
              <div className="bg-muted/30 p-4 rounded-md border">
                {/* Only allow collection management in edit mode */}
                {isViewMode ? (
                  <BookCollectionAssignment 
                    book={book} 
                    onCollectionsUpdated={() => {
                      // Refresh the book data after collections are updated
                      onUpdate(editedBook);
                    }}
                  />
                ) : (
                  <BookCollectionAssignment 
                    book={editedBook} 
                    onCollectionsUpdated={() => {
                      // Refresh the book data after collections are updated
                      setEditedBook({...editedBook});
                    }}
                  />
                )}
              </div>
            )}
          </div>

          {/* Book Metadata Section */}
          <div className="space-y-3 mt-6">
            <div 
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setShowMetadataInfo(!showMetadataInfo)}
            >
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                <h3 className="text-base font-medium">Book Metadata</h3>
              </div>
              <Button variant="ghost" size="sm" className="p-1 h-8 w-8">
                {showMetadataInfo ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
            
            {showMetadataInfo && (
              <div className="bg-muted/30 p-4 rounded-md border">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">ISBN Information</h4>
                    <div className="space-y-2 text-sm">
                      {/* Display ISBN-10 */}
                      <div>
                        <span className="font-medium">ISBN-10:</span> 
                        <div className="pl-4">
                          {editedBook.isbn10 && editedBook.isbn10.length > 0 ? 
                            editedBook.isbn10.map((isbn, index) => (
                              <div key={`isbn10-${index}`}>{isbn}</div>
                            )) : 
                            <span className="text-muted-foreground italic">None</span>
                          }
                        </div>
                      </div>
                      
                      {/* Display ISBN-13 */}
                      <div>
                        <span className="font-medium">ISBN-13:</span>
                        <div className="pl-4">
                          {editedBook.isbn13 && editedBook.isbn13.length > 0 ? 
                            editedBook.isbn13.map((isbn, index) => (
                              <div key={`isbn13-${index}`}>{isbn}</div>
                            )) : 
                            <span className="text-muted-foreground italic">None</span>
                          }
                        </div>
                      </div>
                      
                      {/* Legacy ISBN */}
                      {/* Legacy ISBN field removed - not in Book interface */}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-2">API Source</h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">Source Type:</span> 
                        <span className="ml-2">
                          {editedBook.sourceType ? (
                            <Badge variant="outline" className="ml-1">
                              {editedBook.sourceType === 'google' ? 'Google Books' : 
                               editedBook.sourceType === 'openlib' ? 'Open Library' : 
                               editedBook.sourceType === 'manual' ? 'Manual Entry' : 
                               editedBook.sourceType}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground italic">Unknown</span>
                          )}
                        </span>
                      </div>
                      
                      <div>
                        <span className="font-medium">Source ID:</span> 
                        <span className="ml-2">
                          {editedBook.sourceId ? (
                            <code className="px-1 py-0.5 bg-muted rounded text-xs">{editedBook.sourceId}</code>
                          ) : (
                            <span className="text-muted-foreground italic">None</span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 text-xs text-muted-foreground">
                  <p>Metadata is read-only and is maintained automatically by the system.</p>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons - Only visible in edit mode */}
          {!isViewMode && (
            <div className="flex flex-wrap gap-2 pt-4">
              {onDelete && (
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteConfirmation}
                  className="bg-gradient-danger hover:bg-destructive/90 mr-auto"
                  title="Delete Book"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Book
                </Button>
              )}
              <div className="flex-grow"></div>
              <Button 
                variant="outline" 
                onClick={onClose}
                type="button"
                title="Cancel Changes"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSave} 
                className="bg-gradient-warm hover:bg-primary-glow"
                disabled={isSaving}
                type="button"
                title="Save Changes (Ctrl+S)"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          )}
          
          {/* Floating Edit Button - Only visible in view mode */}
          {isViewMode && (
            <div className="fixed bottom-4 right-4 z-50">
              <Button
                size="lg"
                onClick={() => setIsViewMode(false)}
                className="rounded-full h-12 w-12 shadow-lg bg-gradient-warm hover:bg-primary-glow flex items-center justify-center"
                aria-label="Switch to edit mode"
                title="Edit Book Details"
              >
                <Pencil className="h-5 w-5" />
              </Button>
            </div>
          )}
          
          {/* Delete Confirmation Dialog */}
          <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
            <AlertDialogContent className="max-w-md">
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Delete Book
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete "{editedBook.title}"? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel 
                  onClick={(e) => {
                    e.preventDefault();
                    setShowDeleteConfirm(false);
                  }}
                  type="button"
                >
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction 
                  onClick={confirmDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={isDeleting}
                  type="button"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          
          {/* Series Removal Confirmation Dialog */}
          <AlertDialog open={showRemoveConfirm} onOpenChange={setShowRemoveConfirm}>
            <AlertDialogContent className="max-w-md">
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-primary" />
                  Remove from Series
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to remove this book from the series? This action will take effect immediately.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel 
                  onClick={(e) => {
                    e.preventDefault();
                    setShowRemoveConfirm(false);
                  }}
                  type="button"
                >
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleRemoveFromSeries}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  type="button"
                >
                  Remove
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          
          {/* Series Assignment Dialog */}
          <SeriesAssignmentDialog
            open={showSeriesAssignmentDialog}
            onOpenChange={setShowSeriesAssignmentDialog}
            book={book}
            existingBooks={availableSeries.length > 0 ? availableSeries.map(s => ({ ...book, id: s.id })) : []}
            detectedSeries={seriesDetectionResult}
            onAssignSeries={handleAssignSeries}
            onCreateNewSeries={handleCreateNewSeries}
            mode="change"
            currentBookSeriesId={selectedSeriesId}
          />
          
          {/* Create Series Dialog */}
          <CreateSeriesDialog
            open={showCreateSeriesDialog}
            onOpenChange={setShowCreateSeriesDialog}
            onSeriesCreated={(newSeries) => {
              // Associate current book with new series
              handleAssignSeries(book, newSeries.id);
              toast({
                title: "Book added to new series",
                description: `Successfully added "${book.title}" to "${newSeries.name}" series`
              });
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
};

// Export as default as well to support both import styles
export default BookDetails;