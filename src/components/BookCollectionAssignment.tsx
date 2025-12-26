import React, { useState, useEffect } from 'react';
import { Check, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Collection } from '@/types/collection';
import { Book } from '@/types/book';
import { collectionRepository } from '@/repositories/CollectionRepository';
import { enhancedStorageService } from '@/services/storage/EnhancedStorageService';
import { useToast } from '@/components/ui/use-toast';

interface BookCollectionAssignmentProps {
  book: Book;
  onCollectionsUpdated?: () => void;
}

const BookCollectionAssignment: React.FC<BookCollectionAssignmentProps> = ({ 
  book,
  onCollectionsUpdated
}) => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [bookCollections, setBookCollections] = useState<Collection[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  
  const { toast } = useToast();
  
  // Load collections when component mounts or dialog opens
  useEffect(() => {
    loadCollections();
  }, []);
  
  // Load all collections and determine which ones contain this book
  const loadCollections = async () => {
    setIsLoading(true);
    try {
      // Get all collections
      const allCollections = await collectionRepository.getAll();
      setCollections(allCollections);
      
      // Filter to get collections that contain this book
      const bookCollections = allCollections.filter(collection => 
        collection.bookIds.includes(book.id)
      );
      setBookCollections(bookCollections);
    } catch (error) {
      console.error('Error loading collections:', error);
      toast({
        title: 'Error',
        description: 'Failed to load collections',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Toggle book's membership in a collection
  const toggleCollection = async (collection: Collection) => {
    setIsLoading(true);
    try {
      const isInCollection = bookCollections.some(c => c.id === collection.id);
      
      if (isInCollection) {
        // Remove book from collection
        await collectionRepository.removeBook(collection.id, book.id);
        setBookCollections(prev => prev.filter(c => c.id !== collection.id));
      } else {
        // Check if adding this book would exceed the 1000 book limit
        if (collection.bookIds.length >= 1000) {
          toast({
            title: 'Limit Reached',
            description: 'This collection has reached the maximum limit of 1000 books',
            variant: 'destructive'
          });
          setIsLoading(false);
          return;
        }
        
        // Add book to collection
        await collectionRepository.addBook(collection.id, book.id);
        setBookCollections(prev => [...prev, collection]);
        
        // Update book's collectionIds
        const updatedBook = { ...book };
        updatedBook.collectionIds = updatedBook.collectionIds || [];
        if (!updatedBook.collectionIds.includes(collection.id)) {
          updatedBook.collectionIds.push(collection.id);
          await enhancedStorageService.saveBook(updatedBook);
        }
      }
      
      // Notify parent component if needed
      if (onCollectionsUpdated) {
        onCollectionsUpdated();
      }
    } catch (error) {
      console.error('Error updating collection membership:', error);
      toast({
        title: 'Error',
        description: 'Failed to update collection',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Create a new collection and add the book to it
  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) {
      toast({
        title: 'Error',
        description: 'Collection name is required',
        variant: 'destructive'
      });
      return;
    }
    
    setIsLoading(true);
    try {
      // Create new collection
      const newCollection = await collectionRepository.add({
        name: newCollectionName.trim(),
        description: '',
        bookIds: [book.id]
      });
      
      // Update book's collectionIds
      const updatedBook = { ...book };
      updatedBook.collectionIds = updatedBook.collectionIds || [];
      if (!updatedBook.collectionIds.includes(newCollection.id)) {
        updatedBook.collectionIds.push(newCollection.id);
        await enhancedStorageService.saveBook(updatedBook);
      }
      
      // Update UI
      setCollections(prev => [...prev, newCollection]);
      setBookCollections(prev => [...prev, newCollection]);
      setNewCollectionName('');
      setIsCreateDialogOpen(false);
      
      toast({
        title: 'Success',
        description: `Created collection "${newCollectionName}" and added book`
      });
      
      // Notify parent component if needed
      if (onCollectionsUpdated) {
        onCollectionsUpdated();
      }
    } catch (error) {
      console.error('Error creating collection:', error);
      toast({
        title: 'Error',
        description: 'Failed to create collection',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Filter collections based on search query
  const filteredCollections = collections.filter(collection => 
    collection.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  return (
    <>
      <div>
        <h3 className="text-lg font-medium mb-2">Collections</h3>
        
        {bookCollections.length > 0 ? (
          <div className="flex flex-wrap gap-2 mb-3">
            {bookCollections.map(collection => (
              <div 
                key={collection.id}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium shadow-sm"
                style={{ 
                  backgroundColor: collection.color || '#3b82f6',
                  color: 'white'
                }}
              >
                {collection.name}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm mb-3">Not in any collections</p>
        )}
        
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setIsDialogOpen(true)}
        >
          Manage Collections
        </Button>
      </div>
      
      {/* Collection Assignment Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md bg-background border-2 border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Manage Collections</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <div className="flex items-center gap-2 mb-4">
              <Input
                placeholder="Search collections..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-grow"
              />
              <Button 
                variant="outline"
                size="icon"
                onClick={() => setIsCreateDialogOpen(true)}
                title="Create new collection"
              >
                <Plus size={16} />
              </Button>
            </div>
            
            <ScrollArea className="h-[300px] pr-4">
              {isLoading ? (
                <div className="flex justify-center items-center h-full">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : filteredCollections.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No collections found</p>
                  <Button 
                    variant="link" 
                    onClick={() => setIsCreateDialogOpen(true)}
                  >
                    Create a new collection
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredCollections.map(collection => {
                    const isInCollection = bookCollections.some(c => c.id === collection.id);
                    
                    return (
                      <div 
                        key={collection.id}
                        className={`flex items-center justify-between p-3 rounded-md cursor-pointer hover:bg-accent/10 ${
                          isInCollection ? 'bg-accent/20 border border-accent/30' : 'border border-transparent'
                        }`}
                        onClick={() => toggleCollection(collection)}
                      >
                        <div className="flex items-center gap-3 flex-grow">
                          <div 
                            className="min-w-8 h-8 rounded-full flex items-center justify-center shadow-sm"
                            style={{ backgroundColor: collection.color || '#3b82f6' }}
                          >
                            {isInCollection && <Check size={16} className="text-white" />}
                          </div>
                          <span className="font-medium text-base">{collection.name}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
          
          <DialogFooter>
            <Button onClick={() => setIsDialogOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Create Collection Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Create New Collection</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <Input
              placeholder="Collection name"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              className="w-full"
            />
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateCollection}
              disabled={!newCollectionName.trim() || isLoading}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BookCollectionAssignment;
