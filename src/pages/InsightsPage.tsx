import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Settings } from '@/components/Settings';
import { EnhancedHeader } from '@/components/navigation/EnhancedHeader';
import { InsightsView } from '@/components/InsightsView';
import { GoalsTab } from '@/components/GoalsTab';
import { useSettings } from '@/contexts/SettingsContext';
import { useLibrarySettings } from '@/hooks/useLibrarySettings';

const InsightsPage = () => {
  const { settings } = useSettings();
  const [booksCompletedThisMonth, setBooksCompletedThisMonth] = useState<number>(0);
  
  const { books, setBooks, settingsProps, setShowSettings } = useLibrarySettings({
    onLibraryCleared: () => setBooksCompletedThisMonth(0),
  });
  
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
          addedDate: book.addedDate || new Date().toISOString(),
          completedDate: book.completedDate,
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

        {/* Footer */}
        <footer className="mt-12 mb-6 px-4 text-center text-xs text-muted-foreground/60">
          <nav className="flex items-center justify-center gap-1.5">
            <Link to="/about?tab=changelog" className="hover:text-muted-foreground transition-colors">Changelog</Link>
            <span>·</span>
            <Link to="/about?tab=known-issues" className="hover:text-muted-foreground transition-colors">Known Issues</Link>
            <span>·</span>
            <Link to="/about?tab=roadmap" className="hover:text-muted-foreground transition-colors">Roadmap</Link>
            <span>·</span>
            <Link to="/about?tab=privacy" className="hover:text-muted-foreground transition-colors">Privacy</Link>
            <span>·</span>
            <Link to="/about?tab=about" className="hover:text-muted-foreground transition-colors">About</Link>
          </nav>
        </footer>
      </div>
      
      {/* Settings Modal */}
      <Settings {...settingsProps} />
    </div>
  );
};

export default InsightsPage;
