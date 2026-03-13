import { Collection, CollectionCreationData, CollectionUpdateData } from '@/types/collection';
import { Book } from '@/types/book';
import { DatabaseService } from '@/services/DatabaseService';
import { enhancedStorageService } from '@/services/storage/EnhancedStorageService';
import { bookRepository } from '@/repositories/BookRepository';
import { v4 as uuidv4 } from 'uuid';
import { collectionsApi, CollectionRecord } from '@/lib/apiClient';
import { getStoredAuthToken } from '@/lib/auth-storage';

type StoredCollection = Collection & {
  dateAdded?: string;
  lastModified?: string;
};

const isAuthenticatedSession = (): boolean => Boolean(getStoredAuthToken());

const normalizeRemoteCollection = (collection: CollectionRecord): Collection => ({
  id: collection.id,
  name: collection.name,
  description: collection.description,
  bookIds: collection.bookIds || [],
  color: collection.color,
  imageUrl: collection.imageUrl,
  createdAt: new Date(collection.createdAt),
  updatedAt: new Date(collection.updatedAt),
});

const serializeCollection = (collection: Collection): CollectionRecord => ({
  id: collection.id,
  name: collection.name,
  description: collection.description,
  bookIds: collection.bookIds || [],
  color: collection.color,
  imageUrl: collection.imageUrl,
  createdAt: collection.createdAt.toISOString(),
  updatedAt: collection.updatedAt.toISOString(),
});

/**
 * Repository for managing collection data
 * Uses IndexedDB as the primary source of truth for all collection data
 */
export class CollectionRepository {
  private readonly dbService: DatabaseService;
  private readonly storeName = 'collections';
  
  constructor(dbService: DatabaseService) {
    this.dbService = dbService;
  }
  
  /**
   * Get all collections in the database
   */
  async getAll(): Promise<Collection[]> {
    if (isAuthenticatedSession()) {
      const collections = await collectionsApi.getAll();
      return collections.map(normalizeRemoteCollection);
    }

    try {
      // Get collections from IndexedDB as the source of truth
      const collectionsFromDB = await enhancedStorageService.getCollections();
      
      // Convert from IndexedDB format to the app's Collection format
      const convertedCollections = collectionsFromDB.map(collection => {
        // Extract dateAdded and lastModified from the DB format
        const { dateAdded, lastModified, ...rest } = collection as StoredCollection;
        
        // Return the UI Collection format
        return {
          ...rest,
          createdAt: new Date(dateAdded || new Date().toISOString()),
          updatedAt: new Date(lastModified || new Date().toISOString())
        };
      });
      
      return convertedCollections as Collection[];
    } catch (error) {
      console.error('Error getting all collections from IndexedDB:', error);
      return [];
    }
  }
  
  /**
   * Get a collection by ID
   */
  async getById(id: string): Promise<Collection | null> {
    if (isAuthenticatedSession()) {
      const collection = await collectionsApi.getById(id);
      return normalizeRemoteCollection(collection);
    }

    try {
      // Get from IndexedDB as the source of truth
      const collectionFromDB = await enhancedStorageService.getCollectionById(id);
      if (collectionFromDB) {
        // Extract dateAdded and lastModified from the DB format
        const { dateAdded, lastModified, ...rest } = collectionFromDB as StoredCollection;
        
        // Convert to the app's Collection format
        const convertedCollection = {
          ...rest,
          createdAt: new Date(dateAdded || new Date().toISOString()),
          updatedAt: new Date(lastModified || new Date().toISOString())
        };
        
        return convertedCollection as Collection;
      }
      
      // Not found in IndexedDB
      return null;
    } catch (error) {
      console.error(`Error getting collection ${id}:`, error);
      return null;
    }
  }
  
  /**
   * Get collections containing a specific book
   */
  async getByBookId(bookId: string): Promise<Collection[]> {
    const allCollections = await this.getAll();
    return allCollections.filter(collection => collection.bookIds.includes(bookId));
  }
  
  /**
   * Add a new collection to the database
   */
  async add(collection: CollectionCreationData): Promise<Collection> {
    const now = collection.updatedAt || collection.createdAt || new Date();
    const newCollection: Collection = {
      ...collection,
      id: collection.id || `collection-${uuidv4()}`,
      bookIds: collection.bookIds || [],
      createdAt: collection.createdAt || now,
      updatedAt: collection.updatedAt || now
    };
    
    if (isAuthenticatedSession()) {
      const createdCollection = await collectionsApi.create(serializeCollection(newCollection));
      return normalizeRemoteCollection(createdCollection);
    }

    try {
      // Add to IndexedDB as the source of truth
      const enhancedCollection = {
        ...newCollection,
        // Add required IndexedDB fields
        dateAdded: now.toISOString(),
        lastModified: now.toISOString(),
      };
      
      await enhancedStorageService.saveCollection(enhancedCollection as StoredCollection);
      return newCollection;
    } catch (error) {
      console.error('Error adding collection:', error);
      throw error;
    }
  }
  
  /**
   * Update an existing collection in the database
   */
  async update(id: string, updates: CollectionUpdateData): Promise<Collection | null> {
    const collection = await this.getById(id);
    if (!collection) return null;
    
    const now = new Date();
    const updatedCollection: Collection = {
      ...collection,
      ...updates,
      updatedAt: now
    };
    
    if (isAuthenticatedSession()) {
      const remoteCollection = await collectionsApi.update(
        id,
        serializeCollection(updatedCollection),
      );
      return normalizeRemoteCollection(remoteCollection);
    }

    try {
      // Update IndexedDB as the source of truth
      const enhancedCollection = {
        ...updatedCollection,
        // Add required IndexedDB fields
        dateAdded: updatedCollection.createdAt.toISOString(),
        lastModified: now.toISOString()
      };
      
      await enhancedStorageService.saveCollection(enhancedCollection as StoredCollection);
    } catch (error) {
      console.error(`Error updating collection ${id}:`, error);
      throw error; // Re-throw to notify calling code of the failure
    }
    
    return updatedCollection;
  }
  
  /**
   * Add a book to a collection
   */
  async addBook(id: string, bookId: string): Promise<Collection | null> {
    const collection = await this.getById(id);
    if (!collection) return null;
    
    if (collection.bookIds.includes(bookId)) {
      return collection; // Book already in collection
    }
    
    // Check if adding this book would exceed the 1000 book limit
    if (collection.bookIds.length >= 1000) {
      throw new Error('Collection has reached the maximum limit of 1000 books');
    }
    
    const updatedBooks = [...collection.bookIds, bookId];
    return this.update(id, { bookIds: updatedBooks });
  }
  
  /**
   * Remove a book from a collection
   */
  async removeBook(id: string, bookId: string): Promise<Collection | null> {
    const collection = await this.getById(id);
    if (!collection) return null;
    
    const updatedBooks = collection.bookIds.filter(id => id !== bookId);
    return this.update(id, { bookIds: updatedBooks });
  }
  
  /**
   * Remove a book from a collection and update the book's collection references
   */
  async removeBookFromCollection(collectionId: string, bookId: string): Promise<boolean> {
    try {
      // Update the collection
      const updatedCollection = await this.removeBook(collectionId, bookId);
      if (!updatedCollection) return false;
      
      // Update the book's collection references
      const book = await bookRepository.getById(bookId);
      if (book && book.collectionIds) {
        await bookRepository.update(bookId, {
          collectionIds: book.collectionIds.filter(id => id !== collectionId),
        });
      }
      
      return true;
    } catch (error) {
      console.error(`Error removing book ${bookId} from collection ${collectionId}:`, error);
      return false;
    }
  }
  
  /**
   * Get all books in a collection
   */
  async getBooksInCollection(collectionId: string): Promise<Book[]> {
    try {
      // Get the collection
      const collection = await this.getById(collectionId);
      if (!collection) return [];
      
      // Get all books
      const allBooks = await bookRepository.getAll();
      
      // Filter books that are in this collection
      return allBooks.filter(book => {
        // Check if book is directly in the collection's bookIds
        if (collection.bookIds.includes(book.id)) return true;
        
        // Check if collection is in the book's collectionIds
        return book.collectionIds && book.collectionIds.includes(collectionId);
      });
    } catch (error) {
      console.error(`Error getting books in collection ${collectionId}:`, error);
      return [];
    }
  }
  
  /**
   * Delete a collection from the database
   */
  async delete(id: string): Promise<boolean> {
    try {
      // Get the collection to check if it exists
      const collection = await this.getById(id);
      if (!collection) return false;
      
      if (isAuthenticatedSession()) {
        await collectionsApi.delete(id);
      } else {
        await enhancedStorageService.deleteCollection(id);
      }
      
      // Update all books that reference this collection
      const books = await bookRepository.getAll();
      for (const book of books) {
        if (book.collectionIds && book.collectionIds.includes(id)) {
          await bookRepository.update(book.id, {
            collectionIds: book.collectionIds.filter(collId => collId !== id),
          });
        }
      }
      
      return true;
    } catch (error) {
      console.error(`Error deleting collection ${id}:`, error);
      return false;
    }
  }
  
  /**
   * Create the default "Favorites" collection if it doesn't exist
   */
  async createDefaultFavoritesCollection(): Promise<Collection | null> {
    try {
      // Check if a "Favorites" collection already exists
      const allCollections = await this.getAll();
      const existingFavorites = allCollections.find(c => 
        c.name.toLowerCase() === 'favorites');
      
      if (existingFavorites) {
        return existingFavorites; // Already exists
      }
      
      // Create the default Favorites collection
      const favoritesCollection = await this.add({
        name: 'Favorites',
        description: 'Your favorite books',
        bookIds: [],
        color: '#FFD700' // Gold color for favorites
      });
      
      return favoritesCollection;
    } catch (error) {
      console.error('Error creating default Favorites collection:', error);
      return null;
    }
  }
}

// Export a singleton instance
export const collectionRepository = new CollectionRepository(new DatabaseService());
