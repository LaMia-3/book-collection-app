import { Book } from '@/types/book';

/**
 * Types of fields that can be searched
 */
export type SearchableField = 'title' | 'author' | 'genre' | 'notes' | 'seriesName' | 'all';

/**
 * Search options for advanced search
 */
export interface SearchOptions {
  fields?: SearchableField[];
  fuzzy?: boolean;
  caseSensitive?: boolean;
  exactMatch?: boolean;
  limit?: number;
}

/**
 * Result of a search operation with relevance scoring
 */
export interface SearchResult<T> {
  item: T;
  score: number;
  matches: {
    field: string;
    segments: { text: string; match: boolean }[];
  }[];
}

/**
 * SearchIndex manages indexing and searching of items
 */
class SearchIndex<T> {
  private items: T[] = [];
  private tokenMap: Map<string, Map<string, Set<number>>> = new Map();
  private getItemId: (item: T) => string;
  private getSearchableFields: (item: T) => Record<string, string | undefined>;

  constructor(
    idAccessor: (item: T) => string, 
    fieldAccessor: (item: T) => Record<string, string | undefined>
  ) {
    this.getItemId = idAccessor;
    this.getSearchableFields = fieldAccessor;
  }

  /**
   * Add a single item to the index
   */
  addItem(item: T): void {
    // Get the item ID and add to items array
    const id = this.getItemId(item);
    const index = this.items.length;
    this.items.push(item);

    // Get all searchable fields for this item
    const fields = this.getSearchableFields(item);

    // Index each field separately
    for (const [field, value] of Object.entries(fields)) {
      if (value === undefined || value === null || value === '') continue;

      // Tokenize the field value
      const tokens = this.tokenize(value);

      // Add each token to the index
      for (const token of tokens) {
        // Normalize token for indexing
        const normalizedToken = this.normalizeToken(token);
        
        if (!this.tokenMap.has(field)) {
          this.tokenMap.set(field, new Map());
        }
        
        const fieldMap = this.tokenMap.get(field)!;
        
        if (!fieldMap.has(normalizedToken)) {
          fieldMap.set(normalizedToken, new Set());
        }
        
        fieldMap.get(normalizedToken)!.add(index);
      }
    }
  }

  /**
   * Add multiple items to the index
   */
  addItems(items: T[]): void {
    for (const item of items) {
      this.addItem(item);
    }
  }

  /**
   * Remove an item from the index
   */
  removeItem(id: string): void {
    const index = this.items.findIndex(item => this.getItemId(item) === id);
    if (index === -1) return;
    
    // Remove the item from the items array
    this.items.splice(index, 1);
    
    // Rebuild the index - this is inefficient but works for now
    // In a production app, we'd want a more sophisticated approach
    this.tokenMap.clear();
    for (let i = 0; i < this.items.length; i++) {
      this.addItem(this.items[i]);
    }
  }

  /**
   * Update an item in the index
   */
  updateItem(item: T): void {
    const id = this.getItemId(item);
    this.removeItem(id);
    this.addItem(item);
  }

  /**
   * Clear the entire index
   */
  clear(): void {
    this.items = [];
    this.tokenMap.clear();
  }

  /**
   * Search the index
   */
  search(query: string, options: SearchOptions = {}): SearchResult<T>[] {
    if (!query || query.trim() === '') {
      return this.items.map(item => ({
        item,
        score: 1,
        matches: []
      }));
    }

    const {
      fields = ['all'],
      fuzzy = true,
      caseSensitive = false,
      exactMatch = false,
      limit
    } = options;

    // Normalize the query based on options
    const normalizedQuery = caseSensitive ? query : query.toLowerCase();
    
    // Tokenize the query
    const queryTokens = exactMatch ? [normalizedQuery] : this.tokenize(normalizedQuery);
    
    // Map to store scores for each item
    const scores: Map<number, number> = new Map();
    const matchFields: Map<number, Map<string, string[]>> = new Map();
    
    // Calculate maximum possible score (for normalization)
    const maxScore = queryTokens.length * fields.length;
    
    // Search in each specified field
    for (const field of fields) {
      // If searching all fields, search each one individually
      if (field === 'all') {
        // Get all field names from the token map
        const allFields = Array.from(this.tokenMap.keys());
        for (const specificField of allFields) {
          this.searchField(specificField, queryTokens, fuzzy, scores, matchFields);
        }
      } else {
        this.searchField(field, queryTokens, fuzzy, scores, matchFields);
      }
    }
    
    // Create results array with items and their scores
    const results: SearchResult<T>[] = [];
    
    scores.forEach((score, index) => {
      const item = this.items[index];
      const normalizedScore = score / maxScore;
      
      // Get highlighted matches
      const matches = this.generateMatches(item, matchFields.get(index) || new Map());
      
      results.push({
        item,
        score: normalizedScore,
        matches
      });
    });
    
    // Sort by score descending
    results.sort((a, b) => b.score - a.score);
    
    // Apply limit if specified
    return limit ? results.slice(0, limit) : results;
  }

  /**
   * Search within a specific field
   */
  private searchField(
    field: string, 
    queryTokens: string[], 
    fuzzy: boolean,
    scores: Map<number, number>,
    matchFields: Map<number, Map<string, string[]>>
  ): void {
    const fieldMap = this.tokenMap.get(field);
    if (!fieldMap) return;
    
    for (const queryToken of queryTokens) {
      if (fuzzy) {
        // Fuzzy matching
        for (const [indexedToken, indices] of fieldMap.entries()) {
          if (this.isFuzzyMatch(queryToken, indexedToken)) {
            for (const index of indices) {
              scores.set(index, (scores.get(index) || 0) + this.calculateSimilarity(queryToken, indexedToken));
              
              // Store the match information
              if (!matchFields.has(index)) {
                matchFields.set(index, new Map());
              }
              if (!matchFields.get(index)!.has(field)) {
                matchFields.get(index)!.set(field, []);
              }
              matchFields.get(index)!.get(field)!.push(indexedToken);
            }
          }
        }
      } else {
        // Exact matching
        const indices = fieldMap.get(queryToken);
        if (indices) {
          for (const index of indices) {
            scores.set(index, (scores.get(index) || 0) + 1);
            
            // Store the match information
            if (!matchFields.has(index)) {
              matchFields.set(index, new Map());
            }
            if (!matchFields.get(index)!.has(field)) {
              matchFields.get(index)!.set(field, []);
            }
            matchFields.get(index)!.get(field)!.push(queryToken);
          }
        }
      }
    }
  }

  /**
   * Generate highlighted matches for display
   */
  private generateMatches(item: T, fieldMatches: Map<string, string[]>): { field: string; segments: { text: string; match: boolean }[] }[] {
    const results: { field: string; segments: { text: string; match: boolean }[] }[] = [];
    
    const fields = this.getSearchableFields(item);
    
    for (const [field, matchTokens] of fieldMatches.entries()) {
      const text = fields[field];
      if (!text) continue;
      
      const segments: { text: string; match: boolean }[] = [];
      let lastIndex = 0;
      
      // Sort match tokens by their position in the text
      const sortedMatches = matchTokens.slice().sort((a, b) => {
        const aPos = text.toLowerCase().indexOf(a.toLowerCase());
        const bPos = text.toLowerCase().indexOf(b.toLowerCase());
        return aPos - bPos;
      });
      
      for (const token of sortedMatches) {
        const tokenIndex = text.toLowerCase().indexOf(token.toLowerCase(), lastIndex);
        if (tokenIndex === -1) continue;
        
        if (tokenIndex > lastIndex) {
          segments.push({
            text: text.substring(lastIndex, tokenIndex),
            match: false
          });
        }
        
        segments.push({
          text: text.substring(tokenIndex, tokenIndex + token.length),
          match: true
        });
        
        lastIndex = tokenIndex + token.length;
      }
      
      if (lastIndex < text.length) {
        segments.push({
          text: text.substring(lastIndex),
          match: false
        });
      }
      
      results.push({
        field,
        segments
      });
    }
    
    return results;
  }

  /**
   * Check if two tokens match with fuzzy logic
   */
  private isFuzzyMatch(query: string, token: string): boolean {
    // For short queries (1-2 chars), only exact match
    if (query.length <= 2) return query === token;
    
    // For medium queries (3-4 chars), allow 1 character difference
    if (query.length <= 4) {
      return this.calculateLevenshteinDistance(query, token) <= 1;
    }
    
    // For longer queries, allow more differences based on length
    const maxDistance = Math.floor(query.length / 3);
    return this.calculateLevenshteinDistance(query, token) <= maxDistance;
  }

  /**
   * Calculate Levenshtein edit distance between strings
   */
  private calculateLevenshteinDistance(a: string, b: string): number {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix: number[][] = [];

    // Initialize the matrix
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let i = 0; i <= a.length; i++) {
      matrix[0][i] = i;
    }

    // Fill the matrix
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  /**
   * Calculate similarity score between strings (for fuzzy matching)
   */
  private calculateSimilarity(a: string, b: string): number {
    const distance = this.calculateLevenshteinDistance(a, b);
    const maxLength = Math.max(a.length, b.length);
    
    // Return a score between 0 and 1, where 1 is an exact match
    return 1 - (distance / maxLength);
  }

  /**
   * Tokenize a string into searchable tokens
   */
  private tokenize(text: string): string[] {
    // Remove punctuation and split by whitespace
    return text
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length > 0);
  }

  /**
   * Normalize a token for indexing
   */
  private normalizeToken(token: string): string {
    return token.toLowerCase();
  }
}

/**
 * SearchService manages search operations across the application
 */
export class SearchService {
  private static instance: SearchService;
  private bookIndex: SearchIndex<Book>;
  
  private constructor() {
    this.bookIndex = new SearchIndex<Book>(
      // ID accessor
      (book) => book.id,
      
      // Fields accessor
      (book) => ({
        title: book.title,
        author: book.author,
        genre: book.genre || '',
        notes: book.notes || '',
        seriesName: book.seriesName || '',
        description: book.description || '',
        status: book.status || '',
        googleId: book.googleBooksId || ''
      })
    );
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): SearchService {
    if (!SearchService.instance) {
      SearchService.instance = new SearchService();
    }
    return SearchService.instance;
  }

  /**
   * Index a single book
   */
  public indexBook(book: Book): void {
    this.bookIndex.addItem(book);
  }

  /**
   * Index multiple books
   */
  public indexBooks(books: Book[]): void {
    this.bookIndex.addItems(books);
  }

  /**
   * Update a book in the index
   */
  public updateBook(book: Book): void {
    this.bookIndex.updateItem(book);
  }

  /**
   * Remove a book from the index
   */
  public removeBook(bookId: string): void {
    this.bookIndex.removeItem(bookId);
  }

  /**
   * Clear the entire book index
   */
  public clearIndex(): void {
    this.bookIndex.clear();
  }

  /**
   * Search for books matching the query
   */
  public searchBooks(query: string, options?: SearchOptions): SearchResult<Book>[] {
    return this.bookIndex.search(query, options);
  }
}

// Create and export the singleton instance
export const searchService = SearchService.getInstance();

export default searchService;
