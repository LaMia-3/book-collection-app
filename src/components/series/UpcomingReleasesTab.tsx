import React, { useState, useEffect } from 'react';
import { UpcomingBook } from '@/types/series';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, CalendarClock, RefreshCcw, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface UpcomingReleasesTabProps {
  seriesId: string;
  seriesName: string;
  author?: string;
}

/**
 * Tab for displaying and managing upcoming releases in a series
 */
export const UpcomingReleasesTab = ({ 
  seriesId, 
  seriesName, 
  author 
}: UpcomingReleasesTabProps) => {
  const { toast } = useToast();
  const [upcomingBooks, setUpcomingBooks] = useState<UpcomingBook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAddingManually, setIsAddingManually] = useState(false);
  const [newBookData, setNewBookData] = useState<Partial<UpcomingBook>>({
    title: '',
    expectedReleaseDate: undefined,
    author: author || '',
    preOrderLink: '',
    synopsis: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  
  // Load upcoming releases
  useEffect(() => {
    const loadUpcomingBooks = async () => {
      setIsLoading(true);
      try {
        // In a real app, this would fetch from an API
        // For now, we'll load from localStorage
        const savedUpcomingBooks = localStorage.getItem("upcomingBooks");
        if (savedUpcomingBooks) {
          const parsedBooks = JSON.parse(savedUpcomingBooks) as UpcomingBook[];
          const seriesBooks = parsedBooks.filter(book => book.seriesId === seriesId);
          setUpcomingBooks(seriesBooks);
        } else {
          setUpcomingBooks([]);
        }
      } catch (error) {
        console.error("Error loading upcoming books:", error);
        toast({
          title: "Error loading upcoming releases",
          description: "Failed to load upcoming book releases.",
          variant: "destructive"
        });
        setUpcomingBooks([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadUpcomingBooks();
  }, [seriesId, toast]);
  
  // Refresh upcoming releases
  const handleRefresh = async () => {
    setIsRefreshing(true);
    
    try {
      // In a real app, this would call an API to fetch the latest data
      // For now, just simulate an API call with a timeout
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: "Refresh complete",
        description: "Upcoming releases information is up to date."
      });
    } catch (error) {
      console.error("Error refreshing upcoming releases:", error);
      toast({
        title: "Error refreshing releases",
        description: "Failed to refresh upcoming book releases.",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // Handle manual addition of an upcoming book
  const handleAddBook = () => {
    setIsSaving(true);
    
    try {
      // Validate
      if (!newBookData.title?.trim()) {
        toast({
          title: "Missing title",
          description: "Please enter a title for the upcoming book.",
          variant: "destructive"
        });
        setIsSaving(false);
        return;
      }
      
      // Create new book
      const newBook: UpcomingBook = {
        id: `upcoming-${Date.now()}`,
        title: newBookData.title,
        seriesId,
        seriesName,
        author: newBookData.author || author,
        expectedReleaseDate: newBookData.expectedReleaseDate ? new Date(newBookData.expectedReleaseDate) : undefined,
        preOrderLink: newBookData.preOrderLink,
        synopsis: newBookData.synopsis,
        isUserContributed: true,
        amazonProductId: undefined
      };
      
      // Add to localStorage
      const savedUpcomingBooks = localStorage.getItem("upcomingBooks");
      const existingBooks = savedUpcomingBooks ? JSON.parse(savedUpcomingBooks) as UpcomingBook[] : [];
      const updatedBooks = [...existingBooks, newBook];
      localStorage.setItem("upcomingBooks", JSON.stringify(updatedBooks));
      
      // Update state
      setUpcomingBooks(prev => [...prev, newBook]);
      
      // Reset form
      setNewBookData({
        title: '',
        expectedReleaseDate: undefined,
        author: author || '',
        preOrderLink: '',
        synopsis: ''
      });
      
      // Close dialog
      setIsAddingManually(false);
      
      toast({
        title: "Book added",
        description: "The upcoming book has been added to the series."
      });
    } catch (error) {
      console.error("Error adding upcoming book:", error);
      toast({
        title: "Error adding book",
        description: "Failed to add the upcoming book.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  // Handle deletion of an upcoming book
  const handleDeleteBook = (bookId: string) => {
    if (confirm("Are you sure you want to remove this upcoming book?")) {
      try {
        // Remove from localStorage
        const savedUpcomingBooks = localStorage.getItem("upcomingBooks");
        if (savedUpcomingBooks) {
          const existingBooks = JSON.parse(savedUpcomingBooks) as UpcomingBook[];
          const updatedBooks = existingBooks.filter(book => book.id !== bookId);
          localStorage.setItem("upcomingBooks", JSON.stringify(updatedBooks));
          
          // Update state
          setUpcomingBooks(prev => prev.filter(book => book.id !== bookId));
          
          toast({
            title: "Book removed",
            description: "The upcoming book has been removed."
          });
        }
      } catch (error) {
        console.error("Error removing upcoming book:", error);
        toast({
          title: "Error removing book",
          description: "Failed to remove the upcoming book.",
          variant: "destructive"
        });
      }
    }
  };
  
  // Calculate days until release
  const calculateDaysUntil = (releaseDate?: Date) => {
    if (!releaseDate) return null;
    
    const now = new Date();
    const release = new Date(releaseDate);
    const diffTime = release.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };
  
  // Format date
  const formatDate = (date?: Date) => {
    if (!date) return "Unknown";
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-medium">Upcoming Releases</h2>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1"
          >
            <RefreshCcw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>
          
          <Button 
            onClick={() => setIsAddingManually(true)}
            className="flex items-center gap-1"
          >
            <Plus className="h-4 w-4" />
            Add Manually
          </Button>
        </div>
      </div>
      
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-0">
                <div className="flex">
                  <div className="w-1/3 max-w-[120px] h-[180px] bg-muted" />
                  <div className="flex-grow p-4 space-y-4">
                    <div className="h-5 bg-muted rounded w-3/4" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                    <div className="h-4 bg-muted rounded w-1/3" />
                    <div className="h-8 bg-muted rounded w-1/2 mt-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : upcomingBooks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-muted-foreground/20 rounded-lg">
          <CalendarClock className="h-16 w-16 text-muted-foreground/40 mb-4" />
          <h2 className="text-xl font-medium mb-2">No Upcoming Releases</h2>
          <p className="text-muted-foreground text-center max-w-md mb-6">
            There are no upcoming books announced for this series yet, 
            or they haven't been added to the system.
          </p>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1"
            >
              <RefreshCcw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
              Check for Updates
            </Button>
            <Button onClick={() => setIsAddingManually(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Manually
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {upcomingBooks.map(book => {
            const daysUntil = calculateDaysUntil(book.expectedReleaseDate);
            
            return (
              <Card key={book.id}>
                <CardContent className="p-0">
                  <div className="flex">
                    <div className="w-1/3 max-w-[120px] bg-muted">
                      {book.coverImageUrl ? (
                        <img 
                          src={book.coverImageUrl} 
                          alt={book.title}
                          className="w-full h-full object-cover min-h-[180px]"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full min-h-[180px]">
                          <Calendar className="h-8 w-8 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-grow p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium mb-1">{book.title}</h3>
                          <p className="text-sm text-muted-foreground">{book.author}</p>
                        </div>
                        
                        {book.isUserContributed && (
                          <Badge variant="outline" className="text-xs">
                            User Added
                          </Badge>
                        )}
                      </div>
                      
                      <div className="mt-3">
                        <div className="flex items-center text-sm">
                          <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span>
                            {book.expectedReleaseDate 
                              ? formatDate(book.expectedReleaseDate)
                              : "Release date unknown"}
                          </span>
                        </div>
                        
                        {daysUntil !== null && (
                          <p className={cn(
                            "text-sm mt-1",
                            daysUntil <= 30 ? "text-accent-warm font-medium" : "text-muted-foreground"
                          )}>
                            {daysUntil === 0 
                              ? "Releasing today!" 
                              : daysUntil < 0 
                                ? `Released ${Math.abs(daysUntil)} days ago` 
                                : `${daysUntil} days until release`}
                          </p>
                        )}
                      </div>
                      
                      <div className="mt-4 flex items-center gap-2">
                        {book.preOrderLink && (
                          <Button size="sm" asChild>
                            <a href={book.preOrderLink} target="_blank" rel="noopener noreferrer">
                              Pre-order
                            </a>
                          </Button>
                        )}
                        
                        <Button 
                          size="sm" 
                          variant="ghost"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteBook(book.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      
      {/* Add Upcoming Book Dialog */}
      <Dialog open={isAddingManually} onOpenChange={setIsAddingManually}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Upcoming Book</DialogTitle>
            <DialogDescription>
              Add information about an upcoming book in this series.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Book Title <span className="text-destructive">*</span></Label>
              <Input 
                id="title"
                value={newBookData.title || ''}
                onChange={e => setNewBookData({...newBookData, title: e.target.value})}
                placeholder="Enter book title"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="author">Author</Label>
              <Input 
                id="author"
                value={newBookData.author || ''}
                onChange={e => setNewBookData({...newBookData, author: e.target.value})}
                placeholder={author || "Enter author name"}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="releaseDate">Expected Release Date</Label>
              <Input 
                id="releaseDate"
                type="date"
                value={newBookData.expectedReleaseDate instanceof Date 
                  ? newBookData.expectedReleaseDate.toISOString().split('T')[0]
                  : ''}
                onChange={e => setNewBookData({
                  ...newBookData, 
                  expectedReleaseDate: e.target.value ? new Date(e.target.value) : undefined
                })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="preOrderLink">Pre-order Link</Label>
              <Input 
                id="preOrderLink"
                type="url"
                value={newBookData.preOrderLink || ''}
                onChange={e => setNewBookData({...newBookData, preOrderLink: e.target.value})}
                placeholder="https://..."
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="synopsis">Synopsis</Label>
              <Textarea 
                id="synopsis"
                value={newBookData.synopsis || ''}
                onChange={e => setNewBookData({...newBookData, synopsis: e.target.value})}
                placeholder="Brief description of the book..."
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsAddingManually(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddBook}
              disabled={isSaving}
            >
              {isSaving ? "Adding..." : "Add Book"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
