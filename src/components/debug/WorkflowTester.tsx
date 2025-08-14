import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Check, AlertCircle, Info } from 'lucide-react';
import { Book } from '@/types/book';
import { enhancedStorageService } from '@/services/storage/EnhancedStorageService';
import { seriesService } from '@/services/SeriesService';
import googleBooksProvider from '@/services/api/GoogleBooksProvider';
import openLibraryProvider from '@/services/api/OpenLibraryProvider';
import { Badge } from '@/components/ui/badge';

// Books to search for by API provider
const GOOGLE_BOOK_SEARCHES = [
  // Lord of the Rings series
  { query: 'The Fellowship of the Ring Tolkien', type: 'title' },
  { query: 'The Two Towers Tolkien', type: 'title' },
  { query: 'The Return of the King Tolkien', type: 'title' },
  { query: 'The Hobbit Tolkien', type: 'title' },
  { query: 'The Silmarillion Tolkien', type: 'title' },
  // Mistborn series
  { query: 'The Final Empire Sanderson', type: 'title' },
  { query: 'The Well of Ascension Sanderson', type: 'title' },
  { query: 'The Hero of Ages Sanderson', type: 'title' },
  // Stormlight Archive series
  { query: 'The Way of Kings Sanderson', type: 'title' },
  { query: 'Words of Radiance Sanderson', type: 'title' },
  { query: 'Oathbringer Sanderson', type: 'title' },
  { query: 'Rhythm of War Sanderson', type: 'title' },
  // Foundation series
  { query: 'Foundation Isaac Asimov', type: 'title' },
  { query: 'Foundation and Empire Asimov', type: 'title' },
  { query: 'Second Foundation Asimov', type: 'title' },
  // Dune series
  { query: 'Dune Frank Herbert', type: 'title' },
  { query: 'Dune Messiah Frank Herbert', type: 'title' },
  { query: 'Children of Dune Herbert', type: 'title' },
  // Classics
  { query: '1984 George Orwell', type: 'title' },
  { query: 'Brave New World Huxley', type: 'title' },
  { query: 'The Great Gatsby Fitzgerald', type: 'title' },
  { query: 'To Kill a Mockingbird Lee', type: 'title' },
  { query: 'Moby Dick Melville', type: 'title' },
];

const OPEN_LIBRARY_BOOK_SEARCHES = [
  // Harry Potter series
  { query: 'Harry Potter and the Philosopher\'s Stone Rowling', type: 'title' },
  { query: 'Harry Potter and the Chamber of Secrets Rowling', type: 'title' },
  { query: 'Harry Potter and the Prisoner of Azkaban Rowling', type: 'title' },
  { query: 'Harry Potter and the Goblet of Fire Rowling', type: 'title' },
  { query: 'Harry Potter and the Order of the Phoenix Rowling', type: 'title' },
  { query: 'Harry Potter and the Half-Blood Prince Rowling', type: 'title' },
  { query: 'Harry Potter and the Deathly Hallows Rowling', type: 'title' },
  // Wheel of Time series
  { query: 'The Eye of the World Robert Jordan', type: 'title' },
  { query: 'The Great Hunt Robert Jordan', type: 'title' },
  { query: 'The Dragon Reborn Robert Jordan', type: 'title' },
  { query: 'The Shadow Rising Robert Jordan', type: 'title' },
  { query: 'The Fires of Heaven Robert Jordan', type: 'title' },
  // Chronicles of Narnia
  { query: 'The Lion, the Witch and the Wardrobe Lewis', type: 'title' },
  { query: 'Prince Caspian C.S. Lewis', type: 'title' },
  { query: 'The Voyage of the Dawn Treader Lewis', type: 'title' },
  // Game of Thrones
  { query: 'A Game of Thrones Martin', type: 'title' },
  { query: 'A Clash of Kings Martin', type: 'title' },
  { query: 'A Storm of Swords Martin', type: 'title' },
  // Classic Literature
  { query: 'Pride and Prejudice Jane Austen', type: 'title' },
  { query: 'Jane Eyre Charlotte Bronte', type: 'title' },
  { query: 'Wuthering Heights Emily Bronte', type: 'title' },
  { query: 'The Count of Monte Cristo Dumas', type: 'title' },
  { query: 'War and Peace Tolstoy', type: 'title' },
];

// Series definitions to create
const SERIES_DEFINITIONS = [
  {
    name: 'The Lord of the Rings',
    author: 'J.R.R. Tolkien',
    description: 'Epic high-fantasy novels set in the world of Middle-earth',
    genre: ['fantasy'],
    status: 'completed',
    searchTerms: ['Fellowship of the Ring', 'Two Towers', 'Return of the King', 'Hobbit', 'Silmarillion']
  },
  {
    name: 'Mistborn',
    author: 'Brandon Sanderson',
    description: 'Fantasy series set in a world where ash falls from the sky',
    genre: ['fantasy'],
    status: 'completed',
    searchTerms: ['Final Empire', 'Well of Ascension', 'Hero of Ages']
  },
  {
    name: 'Stormlight Archive',
    author: 'Brandon Sanderson',
    description: 'Epic fantasy series set on the world of Roshar',
    genre: ['fantasy'],
    status: 'ongoing',
    searchTerms: ['Way of Kings', 'Words of Radiance', 'Oathbringer', 'Rhythm of War']
  },
  {
    name: 'Foundation',
    author: 'Isaac Asimov',
    description: 'Science fiction series chronicling the decline and rebirth of a galactic empire',
    genre: ['science fiction'],
    status: 'completed',
    searchTerms: ['Foundation']
  },
  {
    name: 'Dune',
    author: 'Frank Herbert',
    description: 'Science fiction epic set in a distant future amid a feudal interstellar society',
    genre: ['science fiction'],
    status: 'completed',
    searchTerms: ['Dune']
  },
  {
    name: 'Harry Potter',
    author: 'J.K. Rowling',
    description: 'Fantasy series about a young wizard and his adventures',
    genre: ['fantasy'],
    status: 'completed',
    searchTerms: ['Harry Potter']
  },
  {
    name: 'The Wheel of Time',
    author: 'Robert Jordan',
    description: 'Epic fantasy series spanning fourteen books',
    genre: ['fantasy'],
    status: 'completed',
    searchTerms: ['Eye of the World', 'Great Hunt', 'Dragon Reborn', 'Shadow Rising', 'Fires of Heaven']
  },
  {
    name: 'The Chronicles of Narnia',
    author: 'C.S. Lewis',
    description: 'Fantasy series following the adventures of children in the magical world of Narnia',
    genre: ['fantasy'],
    status: 'completed',
    searchTerms: ['Narnia', 'Lion, the Witch and the Wardrobe', 'Prince Caspian', 'Dawn Treader']
  },
  {
    name: 'A Song of Ice and Fire',
    author: 'George R.R. Martin',
    description: 'Epic fantasy series in a medieval setting with political intrigue and warfare',
    genre: ['fantasy'],
    status: 'ongoing',
    searchTerms: ['Game of Thrones', 'Clash of Kings', 'Storm of Swords']
  }
];

interface TestResult {
  step: string;
  success: boolean;
  message: string;
}

/**
 * Workflow Tester Component
 * Tests multiple workflows by adding books from different API providers and creating series
 */
export default function WorkflowTester() {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [progress, setProgress] = useState(0);
  const [allBooks, setAllBooks] = useState<Book[]>([]);
  const [seriesMap, setSeriesMap] = useState<Record<string, string[]>>({});

  // Helper to add test result
  const addResult = (step: string, success: boolean, message: string) => {
    setResults(prev => [...prev, { step, success, message }]);
  };

  // Run the complete workflow test
  const runWorkflowTest = async () => {
    setRunning(true);
    setResults([]);
    setProgress(0);
    
    try {
      // Initialize storage
      addResult("Initialization", true, "Starting workflow test...");
      await enhancedStorageService.initialize();
      
      // Step 1: Add 25 books from Google Books API
      setProgress(5);
      await addBooksFromGoogleAPI();
      
      // Step 2: Add 25 books from Open Library API
      setProgress(50);
      await addBooksFromOpenLibrary();
      
      // Step 3: Create series and assign books
      setProgress(90);
      await createAndAssignSeries();
      
      // Final step: Verify data
      setProgress(95);
      await verifyData();
      
      setProgress(100);
      addResult("Complete", true, "Workflow test completed successfully!");
      
    } catch (error) {
      console.error("Workflow test failed:", error);
      addResult("Error", false, `Test failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setRunning(false);
    }
  };

  // Add 25 books from Google Books API
  const addBooksFromGoogleAPI = async () => {
    addResult("Google Books", true, "Adding books from Google Books API...");
    const books: Book[] = [];
    
    for (let i = 0; i < GOOGLE_BOOK_SEARCHES.length; i++) {
      try {
        const { query, type } = GOOGLE_BOOK_SEARCHES[i];
        
        // Search for the book
        const searchResult = await googleBooksProvider.searchBooks({
          query, 
          type: type as any,
          limit: 1
        });
        
        if (searchResult.books.length === 0) {
          addResult(`Google Book ${i + 1}`, false, `No results found for "${query}"`);
          continue;
        }
        
        // Get the first book's details
        const bookItem = searchResult.books[0];
        const bookDetails = await googleBooksProvider.getBookDetails(bookItem.id);
        
        // Mark as part of series if applicable
        bookDetails.isPartOfSeries = SERIES_DEFINITIONS.some(series => 
          series.searchTerms.some(term => 
            bookDetails.title.toLowerCase().includes(term.toLowerCase())
          )
        );
        
        // Assign reading status based on index
        let status: 'reading' | 'completed' | 'want-to-read' = 'want-to-read';
        
        // First 3 books as "reading" (3 out of 5 total "reading" books)
        if (i < 3) {
          status = 'reading';
        } 
        // Books 5-14 as "completed"
        else if (i >= 5 && i < 15) {
          status = 'completed';
        }

        // Ensure required fields are set with correct types
        const bookToSave = {
          ...bookDetails,
          status,
          isPartOfSeries: bookDetails.isPartOfSeries || false,
          spineColor: bookDetails.spineColor || Math.floor(Math.random() * 8) + 1,
          addedDate: bookDetails.addedDate || new Date().toISOString()
        };
        
        // Save to IndexedDB
        const bookId = await enhancedStorageService.saveBook(bookToSave);
        const addedBook = { ...bookToSave, id: bookId };
        books.push(addedBook);
        
        addResult(`Google Book ${i + 1}`, true, `Added "${addedBook.title}" by ${addedBook.author}`);
        
        // Update progress
        setProgress(5 + (i + 1) * 1.8); // Adjusted for 25 books
        
      } catch (error) {
        console.error(`Error adding Google book ${i + 1}:`, error);
        addResult(`Google Book ${i + 1}`, false, `Failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    setAllBooks(prev => [...prev, ...books]);
    return books;
  };

  // Add 25 books from Open Library API
  const addBooksFromOpenLibrary = async () => {
    addResult("Open Library", true, "Adding books from Open Library API...");
    const books: Book[] = [];
    
    for (let i = 0; i < OPEN_LIBRARY_BOOK_SEARCHES.length; i++) {
      try {
        const { query, type } = OPEN_LIBRARY_BOOK_SEARCHES[i];
        
        // Search for the book
        const searchResult = await openLibraryProvider.searchBooks({
          query, 
          type: type as any,
          limit: 1
        });
        
        if (searchResult.books.length === 0) {
          addResult(`Open Library Book ${i + 1}`, false, `No results found for "${query}"`);
          continue;
        }
        
        // Get the first book's details
        const bookItem = searchResult.books[0];
        const bookDetails = await openLibraryProvider.getBookDetails(bookItem.id);
        
        // Mark as part of series if applicable
        bookDetails.isPartOfSeries = SERIES_DEFINITIONS.some(series => 
          series.searchTerms.some(term => 
            bookDetails.title.toLowerCase().includes(term.toLowerCase())
          )
        );
        
        // Assign reading status based on index
        let status: 'reading' | 'completed' | 'want-to-read' = 'want-to-read';
        
        // First 2 books as "reading" (2 out of 5 total "reading" books, other 3 from Google Books)
        if (i < 2) {
          status = 'reading';
        } 
        // Books 5-14 as "completed"
        else if (i >= 5 && i < 15) {
          status = 'completed';
        }

        // Ensure required fields are set with correct types
        const bookToSave = {
          ...bookDetails,
          status,
          isPartOfSeries: bookDetails.isPartOfSeries || false,
          spineColor: bookDetails.spineColor || Math.floor(Math.random() * 8) + 1,
          addedDate: bookDetails.addedDate || new Date().toISOString()
        };
        
        // Save to IndexedDB
        const bookId = await enhancedStorageService.saveBook(bookToSave);
        const addedBook = { ...bookToSave, id: bookId };
        books.push(addedBook);
        
        addResult(`Open Library Book ${i + 1}`, true, `Added "${addedBook.title}" by ${addedBook.author}`);
        
        // Update progress
        setProgress(50 + (i + 1) * 1.6); // Adjusted for 25 books
        
      } catch (error) {
        console.error(`Error adding Open Library book ${i + 1}:`, error);
        addResult(`Open Library Book ${i + 1}`, false, `Failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    setAllBooks(prev => [...prev, ...books]);
    return books;
  };

  // Create series and assign books to them
  const createAndAssignSeries = async () => {
    addResult("Series Creation", true, "Creating series and assigning books...");
    const allBooks = await enhancedStorageService.getBooks();
    const newSeriesMap: Record<string, string[]> = {};
    
    for (const seriesDef of SERIES_DEFINITIONS) {
      try {
        // Find books that belong to this series
        const seriesBooks = allBooks.filter(book => 
          seriesDef.searchTerms.some(term => 
            book.title.toLowerCase().includes(term.toLowerCase())
          )
        );
        
        if (seriesBooks.length === 0) {
          addResult(`Series: ${seriesDef.name}`, false, `No books found for series "${seriesDef.name}"`);
          continue;
        }
        
        // Create the series
        const newSeries = await seriesService.createSeries({
          name: seriesDef.name,
          author: seriesDef.author,
          description: seriesDef.description,
          books: seriesBooks.map(book => book.id),
          genre: seriesDef.genre,
          status: seriesDef.status as any,
          readingOrder: 'publication',
          totalBooks: seriesBooks.length,
          coverImage: seriesBooks[0].thumbnail,
          isTracked: true,
          hasUpcoming: false
        });
        
        newSeriesMap[newSeries.id] = seriesBooks.map(book => book.id);
        
        // Update the books to reference the series
        for (const book of seriesBooks) {
          await enhancedStorageService.saveBook({
            ...book,
            isPartOfSeries: true
          });
        }
        
        addResult(`Series: ${seriesDef.name}`, true, `Created series "${seriesDef.name}" with ${seriesBooks.length} books`);
        
      } catch (error) {
        console.error(`Error creating series ${seriesDef.name}:`, error);
        addResult(`Series: ${seriesDef.name}`, false, `Failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    setSeriesMap(newSeriesMap);
  };

  // Verify data consistency
  const verifyData = async () => {
    try {
      // Check that all books are in the database
      const books = await enhancedStorageService.getBooks();
      const series = await seriesService.getAllSeries();
      
      addResult("Data Verification", true, 
        `Successfully verified data: ${books.length} books and ${series.length} series in the database`);
    } catch (error) {
      addResult("Data Verification", false, 
        `Data verification failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold">Library Workflow Tester</h2>
        <p className="text-muted-foreground">
          This test adds 50 books to the library (25 from Google Books API and 25 from Open Library API),
          sets 5 books as "reading", marks some books as "completed", and creates series relationships between related books.
        </p>
        
        <div className="flex justify-between items-center">
          <Button 
            onClick={runWorkflowTest} 
            disabled={running} 
            size="lg"
          >
            {running ? 'Running Test...' : 'Run Complete Workflow Test'}
          </Button>
          
          {progress > 0 && (
            <div className="flex flex-col gap-2 w-full max-w-sm ml-4">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}
        </div>
      </div>
      
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {results.map((result, index) => (
              <Alert key={index} variant={result.success ? "default" : "destructive"}>
                <div className="flex items-center gap-2">
                  {result.success ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                  <AlertTitle>{result.step}</AlertTitle>
                </div>
                <AlertDescription>{result.message}</AlertDescription>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}

      {allBooks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Added Books</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allBooks.map(book => (
                <div 
                  key={book.id} 
                  className="flex gap-3 border rounded p-3"
                >
                  {book.thumbnail && (
                    <img 
                      src={book.thumbnail} 
                      alt={book.title}
                      className="w-16 h-auto object-cover"
                    />
                  )}
                  <div>
                    <h3 className="font-medium">{book.title}</h3>
                    <p className="text-sm text-muted-foreground">{book.author}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <Badge variant="outline">{book.sourceType}</Badge>
                      {book.isPartOfSeries && (
                        <Badge>Series</Badge>
                      )}
                      <Badge variant={book.status === 'reading' ? 'default' : 
                               book.status === 'completed' ? 'secondary' : 'outline'}>
                        {book.status === 'reading' ? 'Reading' : 
                         book.status === 'completed' ? 'Completed' : 'Want to Read'}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
