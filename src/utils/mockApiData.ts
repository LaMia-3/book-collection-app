import { Series, UpcomingBook } from "@/types/series";
import { Book } from "@/types/book";

/**
 * Generate mock series data for development and testing
 */
export const generateMockSeries = (): Series[] => {
  return [
    {
      id: "series-stormlight-archive",
      name: "The Stormlight Archive",
      description: "Epic fantasy series set in the world of Roshar, featuring complex characters and intricate worldbuilding.",
      author: "Brandon Sanderson",
      coverImage: "https://picsum.photos/seed/stormlight/400/600",
      books: ["book-1", "book-2", "book-3"],
      totalBooks: 10,
      readingOrder: 'publication',
      status: 'ongoing',
      isTracked: true,
      hasUpcoming: true,
      createdAt: new Date(2023, 5, 15),
      updatedAt: new Date(2023, 10, 20)
    },
    {
      id: "series-mistborn",
      name: "Mistborn",
      description: "Fantasy series set in a world where ash falls from the sky and mists dominate the night.",
      author: "Brandon Sanderson",
      coverImage: "https://picsum.photos/seed/mistborn/400/600",
      books: ["book-4", "book-5"],
      totalBooks: 7,
      readingOrder: 'publication',
      status: 'ongoing',
      isTracked: false,
      hasUpcoming: true,
      createdAt: new Date(2023, 2, 10),
      updatedAt: new Date(2023, 8, 5)
    },
    {
      id: "series-dune",
      name: "Dune Chronicles",
      description: "Science fiction epic set in a distant future amidst a feudal interstellar society.",
      author: "Frank Herbert",
      coverImage: "https://picsum.photos/seed/dune/400/600",
      books: ["book-6"],
      totalBooks: 6,
      readingOrder: 'publication',
      customOrder: ["book-6"],
      status: 'completed',
      isTracked: true,
      hasUpcoming: false,
      createdAt: new Date(2023, 1, 20),
      updatedAt: new Date(2023, 7, 12)
    }
  ];
};

/**
 * Generate mock upcoming book data for development and testing
 */
export const generateMockUpcomingBooks = (): UpcomingBook[] => {
  return [
    {
      id: "upcoming-stormlight-1",
      title: "The Stormlight Archive Book 5",
      seriesId: "series-stormlight-archive",
      seriesName: "The Stormlight Archive",
      author: "Brandon Sanderson",
      expectedReleaseDate: new Date(new Date().setMonth(new Date().getMonth() + 4)),
      coverImageUrl: "https://picsum.photos/seed/stormlight5/400/600",
      preOrderLink: "https://www.amazon.com/",
      synopsis: "The fifth book in the New York Times bestselling Stormlight Archive epic fantasy series.",
      isUserContributed: false,
      amazonProductId: "B09LCJPR13"
    },
    {
      id: "upcoming-mistborn-1",
      title: "The Lost Metal",
      seriesId: "series-mistborn",
      seriesName: "Mistborn",
      author: "Brandon Sanderson",
      expectedReleaseDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
      coverImageUrl: "https://picsum.photos/seed/mistborn2/400/600",
      preOrderLink: "https://www.amazon.com/",
      synopsis: "The final novel of the Mistborn Era 2 series.",
      isUserContributed: false,
      amazonProductId: "B0B7YGLCVS"
    },
    {
      id: "upcoming-expanse-1",
      title: "Leviathan Falls",
      seriesId: "series-expanse",
      seriesName: "The Expanse",
      author: "James S. A. Corey",
      expectedReleaseDate: new Date(new Date().setMonth(new Date().getMonth() + 3)),
      coverImageUrl: "https://picsum.photos/seed/expanse/400/600",
      preOrderLink: "https://www.amazon.com/",
      synopsis: "The ninth and final novel in the Expanse series.",
      isUserContributed: false,
      amazonProductId: "B094WYDBBG"
    }
  ];
};

/**
 * Detect potential series from a book collection
 */
export const detectPotentialSeries = (books: Book[]): Record<string, Book[]> => {
  const seriesByName: Record<string, Book[]> = {};
  
  // Group by existing series name first
  for (const book of books) {
    if (book._legacySeriesName) {
      if (!seriesByName[book._legacySeriesName]) {
        seriesByName[book._legacySeriesName] = [];
      }
      seriesByName[book._legacySeriesName].push(book);
    }
  }
  
  // Look for books by the same author with similar titles
  const booksByAuthor: Record<string, Book[]> = {};
  for (const book of books) {
    if (!book._legacySeriesName) { // Skip books already in a series
      if (!booksByAuthor[book.author]) {
        booksByAuthor[book.author] = [];
      }
      booksByAuthor[book.author].push(book);
    }
  }
  
  // For each author with multiple books, look for title patterns
  for (const [author, authorBooks] of Object.entries(booksByAuthor)) {
    if (authorBooks.length < 2) continue;
    
    // Very simple pattern matching - just check for books with the same first word
    const titleGroups: Record<string, Book[]> = {};
    for (const book of authorBooks) {
      const firstWord = book.title.split(' ')[0];
      if (firstWord.length > 3) { // Ignore short first words like "The", "A", etc.
        if (!titleGroups[firstWord]) {
          titleGroups[firstWord] = [];
        }
        titleGroups[firstWord].push(book);
      }
    }
    
    // Add groups with multiple books as potential series
    for (const [firstWord, group] of Object.entries(titleGroups)) {
      if (group.length >= 2) {
        seriesByName[`${firstWord} Series`] = group;
      }
    }
  }
  
  return seriesByName;
};
