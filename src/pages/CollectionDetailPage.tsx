import React, { useState, useEffect } from 'react';
import { BookDetails } from "@/components/BookDetails";
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Edit, Trash2, Plus, Search, Filter, SortAsc, SortDesc, Grid, List, BookOpen, Pencil, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader, HeaderActionButton } from '@/components/ui/page-header';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collection } from '@/types/collection';
import { Book } from '@/types/book';
import { collectionRepository } from '@/repositories/CollectionRepository';
import { bookRepository } from '@/repositories/BookRepository';

const CollectionDetailPage: React.FC = () => {
  const { collectionId } = useParams<{ collectionId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // State for collection and books
  const [collection, setCollection] = useState<Collection | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([]);
  const [allBooks, setAllBooks] = useState<Book[]>([]);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  
  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'alphabetical' | 'author' | 'recent'>('alphabetical');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAddBooksDialogOpen, setIsAddBooksDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('books');
  const [selectedBookForDetails, setSelectedBookForDetails] = useState<Book | null>(null);
  const [isBookDetailsOpen, setIsBookDetailsOpen] = useState(false);
  
  // Form state for editing collection
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3b82f6',
    imageUrl: ''
  });
  
  // Load collection and its books
  useEffect(() => {
    if (!collectionId) return;
    
    const loadCollectionAndBooks = async () => {
      setIsLoading(true);
      try {
        // Load collection
        const collectionData = await collectionRepository.getById(collectionId);
        if (!collectionData) {
          toast({
            title: 'Collection not found',
            description: 'The requested collection could not be found.',
            variant: 'destructive'
          });
          navigate('/collections');
          return;
        }
        
        setCollection(collectionData);
        setFormData({
          name: collectionData.name,
          description: collectionData.description || '',
          color: collectionData.color || '#3b82f6',
          imageUrl: collectionData.imageUrl || ''
        });
        
        // Load all books for reference
        const allBooksData = await bookRepository.getAll();
        setAllBooks(allBooksData);
        
        // Load books in this collection
        const booksInCollection = await collectionRepository.getBooksInCollection(collectionId);
        setBooks(booksInCollection);
        setFilteredBooks(booksInCollection);
      } catch (error) {
        console.error('Error loading collection details:', error);
        toast({
          title: 'Error loading collection',
          description: 'There was a problem loading the collection data.',
          variant: 'destructive'
        });
        navigate('/collections');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadCollectionAndBooks();
  }, [collectionId, navigate, toast]);
  
  // Filter and sort books when books, searchQuery, or sortOrder changes
  useEffect(() => {
    if (!books.length) return;
    
    let filtered = [...books];
    
    // Apply search filter if query exists
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(book => 
        book.title.toLowerCase().includes(query) || 
        book.author.toLowerCase().includes(query)
      );
    }
    
    // Apply sorting
    if (sortOrder === 'alphabetical') {
      filtered.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortOrder === 'author') {
      filtered.sort((a, b) => a.author.localeCompare(b.author));
    } else if (sortOrder === 'recent') {
      // Sort by title as a fallback since we don't have date fields on Book
      filtered.sort((a, b) => a.title.localeCompare(b.title));
    }
    
    setFilteredBooks(filtered);
  }, [books, searchQuery, sortOrder]);
  
  // Handle editing a collection
  const handleEditCollection = async () => {
    if (!collection || !formData.name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Collection name is required',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      await collectionRepository.update(collection.id, {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        color: formData.color,
        imageUrl: formData.imageUrl.trim() || undefined
      });
      
      toast({
        title: 'Success',
        description: 'Collection updated successfully!'
      });
      
      // Update local state
      setCollection({
        ...collection,
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        color: formData.color,
        imageUrl: formData.imageUrl.trim() || undefined
      });
      
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error('Error updating collection:', error);
      toast({
        title: 'Error',
        description: 'Failed to update collection',
        variant: 'destructive'
      });
    }
  };
  
  // Handle deleting a collection
  const handleDeleteCollection = async () => {
    if (!collection) return;
    
    try {
      await collectionRepository.delete(collection.id);
      
      toast({
        title: 'Success',
        description: 'Collection deleted successfully!'
      });
      
      navigate('/collections');
    } catch (error) {
      console.error('Error deleting collection:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete collection',
        variant: 'destructive'
      });
    }
  };
  
  // Handle removing a book from the collection
  const handleRemoveBook = async (bookId: string) => {
    if (!collection) return;
    
    try {
      await collectionRepository.removeBookFromCollection(collection.id, bookId);
      
      toast({
        title: 'Success',
        description: 'Book removed from collection'
      });
      
      // Update local state
      const updatedBooks = books.filter(book => book.id !== bookId);
      setBooks(updatedBooks);
    } catch (error) {
      console.error('Error removing book from collection:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove book from collection',
        variant: 'destructive'
      });
    }
  };
  
  // Get series name for a book
  const getSeriesForBook = (book: Book) => {
    if (!book.seriesId) return null;
    
    // Find series in all books that match this book's seriesId
    const series = allBooks.find(b => b.seriesId === book.seriesId);
    if (series) {
      return { id: book.seriesId, name: series.title };
    }
    return null;
  };
  
  // Handle opening book details
  const handleOpenBookDetails = (book: Book) => {
    setSelectedBookForDetails(book);
    setIsBookDetailsOpen(true);
  };
  
  // Handle updating a book
  const handleUpdateBook = async (updatedBook: Book) => {
    try {
      // Update local state
      setBooks(prevBooks => 
        prevBooks.map(book => book.id === updatedBook.id ? updatedBook : book)
      );
      setFilteredBooks(prevBooks =>
        prevBooks.map(book => book.id === updatedBook.id ? updatedBook : book)
      );
      setAllBooks(prevBooks =>
        prevBooks.map(book => book.id === updatedBook.id ? updatedBook : book)
      );
      setSelectedBookForDetails(updatedBook);
      
      toast({
        title: "Book updated",
        description: "Book details have been updated successfully."
      });
      
      setIsBookDetailsOpen(false);
    } catch (error) {
      console.error("Error updating book:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update book details.",
        variant: "destructive"
      });
    }
  };
  
  // Render book card with remove option
  const renderBookCard = (book: Book) => {
    const seriesInfo = book.isPartOfSeries ? getSeriesForBook(book) : null;
    
    return (
      <div key={book.id} className="relative group cursor-pointer h-full" onClick={() => handleOpenBookDetails(book)}>
        <div className="rounded-lg overflow-hidden border border-border hover:shadow-md transition-all h-full flex flex-col bg-card hover:border-primary/30">
          <div className="relative aspect-[2/3] overflow-hidden">
            {book.thumbnail ? (
              <img 
                src={book.thumbnail} 
                alt={`${book.title} cover`}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder.svg';
                }}
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <BookOpen className="h-12 w-12 text-muted-foreground/50" />
              </div>
            )}
            
            {/* Status badge - positioned on the cover */}
            {book.status && (
              <div className="absolute top-2 left-2">
                <Badge variant={book.status === 'completed' ? 'default' : 
                        book.status === 'reading' ? 'secondary' : 'outline'} 
                       className="text-xs shadow-sm">
                  {book.status}
                </Badge>
              </div>
            )}
          </div>
          
          <div className="p-3 flex-grow flex flex-col">
            <h3 className="font-medium truncate">{book.title}</h3>
            <p className="text-sm text-muted-foreground truncate">{book.author}</p>
            
            <div className="mt-auto pt-2 space-y-1.5">
              {/* Series info */}
              {seriesInfo && (
                <div>
                  <Badge variant="outline" className="text-xs w-full justify-start overflow-hidden text-ellipsis">
                    <span className="truncate">Series: {seriesInfo.name}</span>
                  </Badge>
                </div>
              )}
              
              {/* Notes indicator */}
              {book.notes && (
                <div className="text-xs text-muted-foreground truncate">
                  <span className="font-medium">Notes:</span> {book.notes.substring(0, 20)}{book.notes.length > 20 ? '...' : ''}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Remove button */}
        <Button
          variant="destructive"
          size="icon"
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-10"
          onClick={(e) => {
            e.stopPropagation();
            handleRemoveBook(book.id);
          }}
        >
          <Trash2 size={16} />
        </Button>
      </div>
    );
  };
  
  // Render book list item with remove option
  const renderBookListItem = (book: Book) => {
    const seriesInfo = book.isPartOfSeries ? getSeriesForBook(book) : null;
    
    return (
      <div 
        key={book.id} 
        className="relative group border-b py-4 px-4 hover:bg-accent/5 cursor-pointer flex items-center gap-4 transition-colors"
        onClick={() => handleOpenBookDetails(book)}
      >
        {/* Book thumbnail */}
        <div className="flex-shrink-0 w-12 h-16 md:w-16 md:h-20 overflow-hidden rounded-md border border-border">
          {book.thumbnail ? (
            <img 
              src={book.thumbnail} 
              alt={`${book.title} cover`}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholder.svg';
              }}
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <BookOpen className="h-6 w-6 text-muted-foreground/50" />
            </div>
          )}
        </div>
        
        {/* Book details */}
        <div className="flex-grow min-w-0"> {/* min-w-0 ensures text truncation works */}
          <h3 className="font-medium truncate">{book.title}</h3>
          <p className="text-sm text-muted-foreground truncate">{book.author}</p>
          
          <div className="flex flex-wrap gap-2 mt-2">
            {/* Status badge */}
            {book.status && (
              <Badge variant={book.status === 'completed' ? 'default' : 
                      book.status === 'reading' ? 'secondary' : 'outline'} 
                     className="text-xs">
                {book.status}
              </Badge>
            )}
            
            {/* Series info */}
            {seriesInfo && (
              <Badge variant="outline" className="text-xs">
                Series: {seriesInfo.name}
              </Badge>
            )}
          </div>
          
          {/* Notes preview */}
          {book.notes && (
            <p className="text-xs text-muted-foreground mt-2 truncate">
              <span className="font-medium">Notes:</span> {book.notes.substring(0, 60)}{book.notes.length > 60 ? '...' : ''}
            </p>
          )}
        </div>
        
        {/* Remove button */}
        <Button
          variant="destructive"
          size="icon"
          className="opacity-0 group-hover:opacity-100 transition-opacity ml-2 flex-shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            handleRemoveBook(book.id);
          }}
        >
          <Trash2 size={16} />
        </Button>
      </div>
    );
  };
  
  // Check if this is the default Favorites collection
  const isFavorites = collection?.name.toLowerCase() === 'favorites';
  
  return (
    <div className="container max-w-7xl mx-auto px-4 py-6">
      {isLoading ? (
        <div className="animate-pulse">
          <div className="h-64 bg-muted rounded-lg mb-6"></div>
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-muted rounded w-1/2 mb-6"></div>
          <div className="h-12 bg-muted rounded mb-6"></div>
          <div className="grid grid-cols-1 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      ) : collection ? (
        <>
          {/* Page Header */}
          <div className="mb-8">
            <PageHeader
              title={collection.name}
              subtitle={collection.description || 'Collection'}
              backTo="/collections"
              backAriaLabel="Back to Collections"
              actions={
                <>
                  <HeaderActionButton
                    icon={<Plus />}
                    label="Add Books"
                    onClick={() => setIsAddBooksDialogOpen(true)}
                    variant="secondary"
                  />
                  <HeaderActionButton
                    icon={<Pencil />}
                    label="Edit collection"
                    onClick={() => setIsEditDialogOpen(true)}
                    variant="secondary"
                  />
                  {!isFavorites && (
                    <HeaderActionButton
                      icon={<Trash2 />}
                      label="Delete collection"
                      onClick={() => setIsDeleteDialogOpen(true)}
                      variant="secondary"
                    />
                  )}
                </>
              }
              className="pb-0"
            />
          </div>
          
          {/* Hero Header with Cover Image */}
          <div className="relative h-64 w-full rounded-lg overflow-hidden mb-6 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20">
            {collection.imageUrl ? (
              <img 
                src={collection.imageUrl} 
                alt={collection.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center"
                style={{ backgroundColor: collection.color || '#3b82f6' }}
              >
                <FolderOpen className="h-24 w-24 text-white/30" />
              </div>
            )}
            
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
            
            <div className="absolute bottom-0 left-0 right-0 p-0 pb-4 text-white">
              <div className="flex flex-col gap-1 pl-4">
                <h1 className="text-2xl font-bold text-white">{collection.name}</h1>
                <span className="text-white/80 font-medium">{books.length} {books.length === 1 ? 'book' : 'books'}</span>
              </div>
            </div>
          </div>
          
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList>
                <TabsTrigger value="books">Books</TabsTrigger>
                <TabsTrigger value="info">Collection Info</TabsTrigger>
              </TabsList>
              
              <TabsContent value="books" className="space-y-4">
                {/* Search and filter controls */}
                <div className="mb-6 flex w-full flex-wrap items-center gap-4 sm:flex-nowrap">
                  <div className="relative w-full min-w-0 sm:flex-grow">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
                    <Input
                      placeholder="Search books..."
                      className="pl-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  
                  <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:flex-nowrap">
                    <Select
                      value={sortOrder}
                      onValueChange={(value) => setSortOrder(value as 'alphabetical' | 'author' | 'recent')}
                    >
                      <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alphabetical">Title (A-Z)</SelectItem>
                        <SelectItem value="author">Author (A-Z)</SelectItem>
                        <SelectItem value="recent">Recently Added</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <div className="ml-auto flex border rounded-md">
                      <Button
                        variant={viewMode === 'grid' ? 'default' : 'ghost'}
                        size="icon"
                        onClick={() => setViewMode('grid')}
                        className="rounded-r-none"
                      >
                        <Grid size={18} />
                      </Button>
                      <Button
                        variant={viewMode === 'list' ? 'default' : 'ghost'}
                        size="icon"
                        onClick={() => setViewMode('list')}
                        className="rounded-l-none"
                      >
                        <List size={18} />
                      </Button>
                    </div>
                  </div>
                </div>
                
                {/* Books display */}
                {filteredBooks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-muted-foreground/20 rounded-lg bg-muted/5">
                    <BookOpen className="h-20 w-20 text-muted-foreground/30 mb-6" />
                    <h2 className="text-2xl font-medium mb-3">No Books Yet</h2>
                    <p className="text-muted-foreground text-center max-w-md mb-8">
                      {searchQuery ? 'Try a different search term' : 'This collection doesn\'t have any books yet. Add books to get started.'}
                    </p>
                    <Button size="lg" onClick={() => setIsAddBooksDialogOpen(true)}>
                      <Plus className="h-5 w-5 mr-2" />
                      Add Books
                    </Button>
                  </div>
                ) : (
                  <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6' : 'space-y-2 divide-y divide-border'}>
                    {filteredBooks.map(book => 
                      viewMode === 'grid' 
                        ? renderBookCard(book) 
                        : renderBookListItem(book)
                    )}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="info" className="space-y-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-medium mb-2">About this Collection</h3>
                        <p className="text-muted-foreground">
                          {collection.description || 'No description provided.'}
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-1">Created</h4>
                        <p className="text-muted-foreground">
                          {new Date(collection.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-1">Last Updated</h4>
                        <p className="text-muted-foreground">
                          {new Date(collection.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-1">Collection Color</h4>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-6 h-6 rounded-full" 
                            style={{ backgroundColor: collection.color || '#3b82f6' }}
                          ></div>
                          <span className="text-muted-foreground">
                            {collection.color || '#3b82f6'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="pt-2">
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(true)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit Collection Details
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          
          {/* Edit Collection Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Collection</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Name</Label>
                  <Input
                    id="edit-name"
                    placeholder="Collection name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-description">Description (optional)</Label>
                  <Textarea
                    id="edit-description"
                    placeholder="Describe your collection"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-color">Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      id="edit-color"
                      value={formData.color}
                      onChange={(e) => setFormData({...formData, color: e.target.value})}
                      className="w-10 h-10 rounded cursor-pointer"
                    />
                    <Input
                      value={formData.color}
                      onChange={(e) => setFormData({...formData, color: e.target.value})}
                      className="flex-grow"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-imageUrl">Image URL (optional)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="edit-imageUrl"
                      placeholder="https://example.com/image.jpg"
                      value={formData.imageUrl}
                      onChange={(e) => setFormData({...formData, imageUrl: e.target.value})}
                    />
                    {formData.imageUrl && (
                      <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0">
                        <img 
                          src={formData.imageUrl} 
                          alt="Preview" 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/40?text=Error';
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleEditCollection}>Save Changes</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          {/* Delete Confirmation Dialog */}
          <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Collection</DialogTitle>
              </DialogHeader>
              
              <div className="py-4">
                <p>Are you sure you want to delete "{collection.name}"?</p>
                <p className="text-sm text-gray-500 mt-2">
                  This action cannot be undone. Books in this collection will not be deleted.
                </p>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
                <Button variant="destructive" onClick={handleDeleteCollection}>Delete Collection</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          {/* Add Books Dialog */}
          <Dialog open={isAddBooksDialogOpen} onOpenChange={setIsAddBooksDialogOpen}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Add Books to Collection</DialogTitle>
              </DialogHeader>
              
              <div className="py-4">
                {allBooks.length === 0 ? (
                  <div className="text-center py-6">
                    <p>No books available to add.</p>
                  </div>
                ) : (
                  <>
                    <div className="mb-4">
                      <Label htmlFor="search-books">Search Books</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
                        <Input
                          id="search-books"
                          placeholder="Search by title or author"
                          className="pl-10"
                        />
                      </div>
                    </div>
                    
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-2">
                        {allBooks
                          .filter(book => !books.some(b => b.id === book.id))
                          .map(book => (
                          <Card key={book.id} className="cursor-pointer hover:bg-accent/5">
                            <CardContent className="p-4 flex items-center">
                              <div className="flex-grow">
                                <h3 className="font-medium">{book.title}</h3>
                                <p className="text-sm text-muted-foreground">{book.author}</p>
                                {book.isPartOfSeries && book.seriesId && (
                                  <Badge variant="outline" className="mt-1 text-xs">
                                    Series: {getSeriesForBook(book)?.name || 'Unknown Series'}
                                  </Badge>
                                )}
                              </div>
                              <Button
                                onClick={async () => {
                                  try {
                                    await collectionRepository.addBook(collection!.id, book.id);
                                    // Refresh books in collection
                                    const updatedBooks = await collectionRepository.getBooksInCollection(collection!.id);
                                    setBooks(updatedBooks);
                                    setFilteredBooks(updatedBooks);
                                    toast({
                                      title: "Book added",
                                      description: `${book.title} has been added to the collection.`
                                    });
                                  } catch (error) {
                                    console.error("Error adding book to collection:", error);
                                    toast({
                                      title: "Error",
                                      description: "Failed to add book to collection.",
                                      variant: "destructive"
                                    });
                                  }
                                }}
                              >
                                <Plus size={16} className="mr-2" />
                                Add
                              </Button>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  </>
                )}
              </div>
              
              <DialogFooter>
                <Button onClick={() => setIsAddBooksDialogOpen(false)}>Close</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          {/* Book Details */}
          {selectedBookForDetails && (
            <BookDetails
              book={selectedBookForDetails}
              onUpdate={handleUpdateBook}
              onClose={() => setSelectedBookForDetails(null)}
            />
          )}
        </>
      ) : (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-600 mb-2">Collection not found</h3>
          <Button className="mt-4" onClick={() => navigate('/collections')}>
            Back to Collections
          </Button>
        </div>
      )}
    </div>
  );
};

export default CollectionDetailPage;
