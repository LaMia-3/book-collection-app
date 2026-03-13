/**
 * Collection data type definitions
 */

/**
 * Collection data type for organizing books into user-defined groups
 */
export interface Collection {
  id: string;
  name: string;
  description?: string;
  bookIds: string[]; // References to book IDs
  createdAt: Date;
  updatedAt: Date;
  color?: string; // Optional visual identifier
  imageUrl?: string; // User-supplied image URL for collection
}

/**
 * Collection with additional UI-specific properties
 */
export interface CollectionWithStats extends Collection {
  bookCount: number; // Number of books in the collection
  isDefault?: boolean; // Whether this is a default collection (e.g., "Favorites")
}

/**
 * Collection creation data
 */
export interface CollectionCreationData {
  id?: string;
  name: string;
  description?: string;
  bookIds?: string[];
  color?: string;
  imageUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Collection update data
 */
export interface CollectionUpdateData {
  name?: string;
  description?: string;
  bookIds?: string[];
  color?: string;
  imageUrl?: string;
}
