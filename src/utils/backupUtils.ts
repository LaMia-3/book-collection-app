import { Book } from '@/types/book';

/**
 * Interface for the backup data structure
 */
interface BackupData {
  version: string;
  timestamp: string;
  books: Book[];
  metadata: {
    bookCount: number;
    appVersion: string;
    creationDate: string;
  };
}

/**
 * Create a backup of the user's book collection
 * @param books Collection of books to backup
 * @returns Backup data object
 */
export function createBackupData(books: Book[]): BackupData {
  const now = new Date();
  
  return {
    version: '1.0.0', // Backup format version
    timestamp: now.toISOString(),
    books: books,
    metadata: {
      bookCount: books.length,
      appVersion: '1.0.0', // App version
      creationDate: now.toISOString(),
    }
  };
}

/**
 * Create and download a backup file
 * @param books Collection of books to backup
 */
export function createBackup(books: Book[]): void {
  try {
    // Create backup data
    const backupData = createBackupData(books);
    
    // Convert to JSON
    const backupJson = JSON.stringify(backupData, null, 2);
    
    // Create a blob and generate download
    const blob = new Blob([backupJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Generate filename with current date
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const filename = `mira-books-backup-${date}.json`;
    
    // Create download link and trigger it
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
    
  } catch (error) {
    console.error('Error creating backup:', error);
    throw new Error(`Failed to create backup: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Result of a restore operation
 */
export interface RestoreResult {
  success: boolean;
  books: Book[];
  bookCount: number;
  backupDate: string;
  message: string;
}

/**
 * Restore books from a backup file
 * @param file Backup file to restore from
 * @returns RestoreResult object with books and metadata
 */
export async function restoreFromBackup(file: File): Promise<RestoreResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const backupContent = e.target?.result as string;
        
        // Parse the backup content
        let backupData: BackupData;
        try {
          backupData = JSON.parse(backupContent);
        } catch (parseError) {
          reject(new Error(`Invalid backup file format. Could not parse JSON.`));
          return;
        }
        
        // Validate backup format
        if (!backupData.version || !backupData.books || !Array.isArray(backupData.books)) {
          reject(new Error(`Invalid backup format. Missing required backup data.`));
          return;
        }
        
        // Process books - ensure they have valid IDs and timestamps
        const processedBooks: Book[] = backupData.books.map(book => ({
          ...book,
          id: book.id || crypto.randomUUID(), // Ensure ID exists
          addedDate: book.addedDate || new Date().toISOString().split('T')[0], // Ensure added date
        }));
        
        // Return successful result
        resolve({
          success: true,
          books: processedBooks,
          bookCount: processedBooks.length,
          backupDate: backupData.timestamp || 'Unknown',
          message: `Successfully restored ${processedBooks.length} books from backup created on ${new Date(backupData.timestamp).toLocaleDateString()}.`
        });
      } catch (error) {
        reject(new Error(`Failed to restore backup: ${error instanceof Error ? error.message : String(error)}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read the backup file.'));
    };
    
    // Start reading the file
    reader.readAsText(file);
  });
}
