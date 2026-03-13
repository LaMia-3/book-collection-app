import { ApiClientError, booksApi } from "@/lib/apiClient";
import { getStoredAuthToken } from "@/lib/auth-storage";
import { Book } from "@/types/book";
import { enhancedStorageService } from "@/services/storage/EnhancedStorageService";
import { convertDbBookToUiBook, convertUiBookToDbBook } from "@/adapters/BookTypeAdapter";

const isAuthenticatedSession = (): boolean => Boolean(getStoredAuthToken());

const normalizeRemoteBook = (book: Book & { createdAt?: string; updatedAt?: string }): Book => {
  return {
    ...book,
    addedDate: book.addedDate || new Date().toISOString(),
    spineColor: book.spineColor || 1,
  };
};

const normalizeLocalBook = (book: Book): Book => {
  return {
    ...book,
    addedDate: book.addedDate || new Date().toISOString(),
    spineColor: book.spineColor || 1,
  };
};

export class BookRepository {
  async getAll(): Promise<Book[]> {
    if (isAuthenticatedSession()) {
      const remoteBooks = await booksApi.getAll();
      return remoteBooks.map((book) => normalizeRemoteBook(book as Book));
    }

    const localBooks = await enhancedStorageService.getBooks();
    return localBooks.map(normalizeLocalBook);
  }

  async getById(id: string): Promise<Book | null> {
    if (isAuthenticatedSession()) {
      try {
        const remoteBook = await booksApi.getById(id);
        return normalizeRemoteBook(remoteBook as Book);
      } catch (error) {
        if (error instanceof ApiClientError && error.status === 404) {
          return null;
        }

        throw error;
      }
    }

    const localBook = await enhancedStorageService.getBookById(id);

    if (!localBook) {
      return null;
    }

    return normalizeLocalBook(convertDbBookToUiBook(localBook));
  }

  async create(book: Book): Promise<Book> {
    if (isAuthenticatedSession()) {
      const createdBook = await booksApi.create(normalizeRemoteBook(book));
      return normalizeRemoteBook(createdBook as Book);
    }

    const bookId = await enhancedStorageService.saveBook(convertUiBookToDbBook(book));

    return {
      ...book,
      id: bookId || book.id,
    };
  }

  async update(id: string, updates: Partial<Book>): Promise<Book> {
    if (isAuthenticatedSession()) {
      const updatedBook = await booksApi.update(id, updates);
      return normalizeRemoteBook(updatedBook as Book);
    }

    const existingBook = await enhancedStorageService.getBookById(id);

    if (!existingBook) {
      throw new Error("Book not found.");
    }

    const updatedBook = convertUiBookToDbBook({
      ...convertDbBookToUiBook(existingBook),
      ...updates,
      id,
    });

    await enhancedStorageService.saveBook(updatedBook);

    return normalizeLocalBook(convertDbBookToUiBook(updatedBook));
  }

  async delete(id: string): Promise<void> {
    if (isAuthenticatedSession()) {
      await booksApi.delete(id);
      return;
    }

    await enhancedStorageService.deleteBook(id);
  }
}

export const bookRepository = new BookRepository();
