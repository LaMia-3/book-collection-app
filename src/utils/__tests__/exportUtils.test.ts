import { booksToCSV, booksToJSON } from '../exportUtils';
import { Book } from '@/types/book';

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-url');
global.URL.revokeObjectURL = jest.fn();

describe('exportUtils', () => {
  // Sample test books
  const testBooks: Book[] = [
    {
      id: '1',
      title: 'Test Book 1',
      author: 'Author 1',
      status: 'reading',
      spineColor: 1,
      addedDate: '2023-01-01'
    },
    {
      id: '2',
      title: 'Test Book, with comma',
      author: 'Author "quotes" 2',
      status: 'completed',
      completedDate: '2023-02-15',
      rating: 4,
      notes: 'Some notes',
      genre: ['Fiction', 'Mystery'],
      isPartOfSeries: true,
      _legacySeriesName: 'Test Series',
      pageCount: 300,
      publishedDate: '2022-01-01',
      spineColor: 2,
      addedDate: '2023-01-02'
    }
  ];

  describe('booksToCSV', () => {
    test('should convert books to CSV format with headers', () => {
      const csv = booksToCSV(testBooks);
      
      // Check that the CSV has headers and data rows
      expect(csv).toContain('title,author,isbn,status,completedDate,rating,notes,genre,isPartOfSeries,seriesName,pageCount,publishedDate,addedDate');
      
      // Check specific content formatting
      expect(csv).toContain('"Test Book 1"');
      expect(csv).toContain('"Author 1"');
      expect(csv).toContain('"reading"');
      
      // Check for proper escaping of quotes and commas
      expect(csv).toContain('"Test Book, with comma"');
      expect(csv).toContain('"Author ""quotes"" 2"'); // Double quotes should be escaped with double quotes
      
      // Check for boolean representation
      expect(csv).toContain('"true"'); // isPartOfSeries
      
      // Check for numerical values
      expect(csv).toContain('4'); // rating
      expect(csv).toContain('300'); // pageCount
    });
  });

  describe('booksToJSON', () => {
    test('should convert books to JSON format', () => {
      const json = booksToJSON(testBooks);
      const parsed = JSON.parse(json);
      
      // Check that we have the expected number of books
      expect(parsed).toHaveLength(2);
      
      // Check first book properties
      expect(parsed[0]).toEqual(expect.objectContaining({
        title: 'Test Book 1',
        author: 'Author 1',
        status: 'reading', // Status is preserved as-is
        addedDate: '2023-01-01',
        isPartOfSeries: false // Default value
      }));
      
      // Check second book properties with more fields
      expect(parsed[1]).toEqual(expect.objectContaining({
        title: 'Test Book, with comma',
        author: 'Author "quotes" 2',
        status: 'completed',
        completedDate: '2023-02-15',
        rating: 4,
        notes: 'Some notes',
        genre: ['Fiction', 'Mystery'],
        isPartOfSeries: true,
        pageCount: 300,
        publishedDate: '2022-01-01',
        addedDate: '2023-01-02'
      }));
    });
  });
});
