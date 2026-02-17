import { v4 as uuidv4 } from 'uuid';
import { Collection } from '@/types/collection';
import { Book } from '@/types/book';
import { collectionRepository } from '@/repositories/CollectionRepository';
import { enhancedStorageService } from '@/services/storage/EnhancedStorageService';

/**
 * Collection test data generator
 * Creates sample collections with books for testing purposes
 */

// Collection themes with matching image URLs
const collectionThemes = [
  {
    name: 'Science Fiction Classics',
    description: 'The greatest sci-fi works throughout history',
    color: '#6366f1', // Indigo
    imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=300&auto=format'
  },
  {
    name: 'Fantasy Worlds',
    description: 'Magical realms and epic adventures',
    color: '#8b5cf6', // Violet
    imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=300&auto=format'
  },
  {
    name: 'Mystery & Thrillers',
    description: 'Page-turning suspense and detective stories',
    color: '#ec4899', // Pink
    imageUrl: null
  },
  {
    name: 'Historical Fiction',
    description: 'Stories set in the past that bring history to life',
    color: '#a16207', // Amber
    imageUrl: 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?q=80&w=300&auto=format'
  },
  {
    name: 'Contemporary Literature',
    description: 'Modern works that reflect our current world',
    color: '#2563eb', // Blue
    imageUrl: null
  },
  {
    name: 'Biographies & Memoirs',
    description: 'Real life stories of fascinating people',
    color: '#059669', // Emerald
    imageUrl: 'https://images.unsplash.com/photo-1456324504439-367cee3b3c32?q=80&w=300&auto=format'
  },
  {
    name: 'Philosophy & Ideas',
    description: 'Thought-provoking works that challenge the mind',
    color: '#475569', // Slate
    imageUrl: null
  },
  {
    name: 'Poetry Collections',
    description: 'Verses that stir the soul',
    color: '#db2777', // Pink
    imageUrl: 'https://images.unsplash.com/photo-1474377207190-a7d8b3334068?q=80&w=300&auto=format'
  },
  {
    name: 'Dystopian Futures',
    description: 'Visions of troubled societies and dark futures',
    color: '#dc2626', // Red
    imageUrl: null
  },
  {
    name: 'Award Winners',
    description: 'Books that have received critical acclaim and prestigious awards',
    color: '#ca8a04', // Yellow
    imageUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?q=80&w=300&auto=format'
  }
];

/**
 * Generate a random number of books between min and max (inclusive)
 */
const getRandomBookCount = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * Randomly select n unique books from the available books
 */
const selectRandomBooks = (books: Book[], count: number): Book[] => {
  // Shuffle the books array
  const shuffled = [...books].sort(() => 0.5 - Math.random());
  // Take the first 'count' elements
  return shuffled.slice(0, Math.min(count, books.length));
};

/**
 * Create a collection with the specified books
 */
const createCollection = async (
  theme: typeof collectionThemes[0], 
  books: Book[]
): Promise<Collection | null> => {
  try {
    const bookIds = books.map(book => book.id);
    
    const collection = await collectionRepository.add({
      name: theme.name,
      description: theme.description,
      color: theme.color,
      imageUrl: theme.imageUrl,
      bookIds: bookIds
    });
    
    // Update each book to reference this collection
    for (const book of books) {
      if (!book.collectionIds) {
        book.collectionIds = [];
      }
      
      if (!book.collectionIds.includes(collection.id)) {
        book.collectionIds.push(collection.id);
        await enhancedStorageService.saveBook(book);
      }
    }
    
    return collection;
  } catch (error) {
    console.error(`Error creating collection "${theme.name}":`, error);
    return null;
  }
};

/**
 * Generate test collections with books
 * Creates 10 collections with varying numbers of books
 */
export const generateTestCollections = async (
  onProgress?: (message: string, progress: number) => void
): Promise<Collection[]> => {
  try {
    // Initialize storage service
    await enhancedStorageService.initialize();
    
    // Get all available books
    onProgress?.('Loading books...', 0);
    const allBooks = await enhancedStorageService.getBooks();
    
    if (allBooks.length < 5) {
      throw new Error('Not enough books available. Please add at least 5 books first.');
    }
    
    const createdCollections: Collection[] = [];
    
    // Create each collection
    for (let i = 0; i < collectionThemes.length; i++) {
      const theme = collectionThemes[i];
      const progress = (i / collectionThemes.length) * 100;
      
      onProgress?.(`Creating collection: ${theme.name}`, progress);
      
      // Determine how many books to include (between 5 and 40)
      const bookCount = getRandomBookCount(5, Math.min(40, allBooks.length));
      
      // Select random books
      const selectedBooks = selectRandomBooks(allBooks, bookCount);
      
      // Create the collection
      const collection = await createCollection(theme, selectedBooks);
      
      if (collection) {
        createdCollections.push(collection);
      }
    }
    
    onProgress?.('All collections created!', 100);
    return createdCollections;
  } catch (error) {
    console.error('Error generating test collections:', error);
    throw error;
  }
};

/**
 * Delete all test collections
 */
export const deleteTestCollections = async (
  onProgress?: (message: string, progress: number) => void
): Promise<void> => {
  try {
    // Get all collections
    onProgress?.('Loading collections...', 0);
    const allCollections = await collectionRepository.getAll();
    
    // Filter to only include our test collections
    const testCollections = allCollections.filter(collection => 
      collectionThemes.some(theme => theme.name === collection.name)
    );
    
    // Delete each collection
    for (let i = 0; i < testCollections.length; i++) {
      const collection = testCollections[i];
      const progress = (i / testCollections.length) * 100;
      
      onProgress?.(`Deleting collection: ${collection.name}`, progress);
      await collectionRepository.delete(collection.id);
    }
    
    onProgress?.('All test collections deleted!', 100);
  } catch (error) {
    console.error('Error deleting test collections:', error);
    throw error;
  }
};
