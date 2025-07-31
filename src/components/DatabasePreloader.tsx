/**
 * DatabasePreloader component
 * 
 * This component ensures that IndexedDB is properly initialized before the app starts.
 * It provides a loading state while the database is being initialized.
 * 
 * IndexedDB is the exclusive source of truth for all data in the application.
 */
import { useEffect, useState } from 'react';
import { enhancedStorageService } from '@/services/storage/EnhancedStorageService';
import { Loader2 } from 'lucide-react';

interface DatabasePreloaderProps {
  children: React.ReactNode;
}

export function DatabasePreloader({ children }: DatabasePreloaderProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initDatabase = async () => {
      try {
        console.log('Initializing database...');
        await enhancedStorageService.initialize();
        
        // Get book counts for diagnostics
        const booksFromDB = await enhancedStorageService.getBooks();
        console.log(`Database initialized with ${booksFromDB.length} books`);
        
        // Get series counts for diagnostics
        const seriesFromDB = await enhancedStorageService.getSeries();
        console.log(`Database initialized with ${seriesFromDB.length} series`);
        
        setIsLoading(false);
      } catch (err) {
        console.error('Database initialization failed:', err);
        setError(`Failed to initialize database: ${err instanceof Error ? err.message : String(err)}`);
        setIsLoading(false);
      }
    };

    initDatabase();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-lg font-medium">Initializing database...</p>
          <p className="text-sm text-muted-foreground">Please wait while we set up your book collection</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="max-w-md p-6 bg-destructive/10 border border-destructive rounded-lg">
          <h2 className="text-lg font-semibold mb-2 text-destructive">Database Error</h2>
          <p className="mb-4">{error}</p>
          <p className="text-sm text-muted-foreground">Try refreshing the page or clearing your browser cache.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
