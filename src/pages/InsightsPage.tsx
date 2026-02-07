import { useState, useEffect } from 'react';
import { Settings } from '@/components/Settings';
import { useToast } from '@/hooks/use-toast';
import { EnhancedHeader } from '@/components/navigation/EnhancedHeader';
import { InsightsView } from '@/components/InsightsView';
import { GoalsTab } from '@/components/GoalsTab';
import { useSettings } from '@/contexts/SettingsContext';
// Removed Select import as it's no longer needed
import { Book } from '@/types/book';

const InsightsPage = () => {
  const { settings } = useSettings();
  const { toast } = useToast();
  // Removed activeTab state as we no longer have tabs
  const [books, setBooks] = useState<Book[]>([]);
  // Removed timePeriod state as it's no longer needed
  const [booksCompletedThisMonth, setBooksCompletedThisMonth] = useState<number>(0);
  const [showSettings, setShowSettings] = useState(false);
  
  // Load books from IndexedDB
  useEffect(() => {
    const loadBooksFromIndexedDB = async () => {
      try {
        // Import the storage service
        const { enhancedStorageService } = await import('@/services/storage/EnhancedStorageService');
        
        // Get books from IndexedDB
        const indexedDBBooks = await enhancedStorageService.getBooks();
        
        // Convert to UI book format
        const uiBooks = indexedDBBooks.map(book => ({
          ...book,
          // Map fields with different names
          addedDate: book.dateAdded || new Date().toISOString(),
          completedDate: book.dateCompleted,
          // Ensure all required fields are present
          isPartOfSeries: book.isPartOfSeries || false,
          spineColor: book.spineColor || 1
        }));
        
        setBooks(uiBooks);
        
        // Calculate books completed in the current month
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();
        
        // Count books completed in the current month
        const completedThisMonth = uiBooks.filter(book => {
          // Check if the book has a completedDate
          if (!book.completedDate) return false;
          
          // Parse the completed date
          const completedDate = new Date(book.completedDate);
          
          // Check if it's the current month and year
          return (
            completedDate.getMonth() === currentMonth &&
            completedDate.getFullYear() === currentYear
          );
        }).length;
        
        setBooksCompletedThisMonth(completedThisMonth);
      } catch (error) {
        console.error("Error loading books from IndexedDB:", error);
        setBooks([]);
      }
    };
    
    loadBooksFromIndexedDB();
  }, []);
  
  // Calculate library name
  const libraryName = settings.preferredName 
    ? `${settings.preferredName}'s Reading Insights`
    : "My Reading Insights";
  
  return (
    <div className="min-h-screen bg-gradient-page">
      <div className="container mx-auto max-w-6xl">
        <EnhancedHeader
          title={libraryName}
          subtitle="Track your reading progress and achievements"
          onSettingsClick={() => setShowSettings(true)}
        />
        
        
        <div className="bg-card rounded-lg p-6 mx-4 shadow-elegant mt-6">
          <InsightsView books={books} onBookClick={() => {/* Handle book click */}} />
        </div>
      </div>
      
      {/* Settings Modal */}
      <Settings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        books={books}
        onDeleteLibrary={async () => {
          try {
            // Import required services
            const { enhancedStorageService } = await import('@/services/storage/EnhancedStorageService');
            
            // Clear reading insights data if needed
            // Note: Reading insights are derived from books, so we don't need to clear separate data
            
            // Update UI
            setBooks([]);
            setBooksCompletedThisMonth(0);
            
            toast({
              title: "Reading Data Reset",
              description: "Your reading insights data has been reset."
            });
            
            return Promise.resolve();
          } catch (error) {
            console.error('Error resetting reading data:', error);
            toast({
              title: "Error",
              description: `Failed to reset reading data: ${error instanceof Error ? error.message : String(error)}`,
              variant: "destructive"
            });
            return Promise.reject(error);
          }
        }}
      />
    </div>
  );
};

export default InsightsPage;
