import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, SortAsc, SortDesc, Grid, List, Trash2, Edit, Image, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collection } from '@/types/collection';
import { collectionRepository } from '@/repositories/CollectionRepository';
import { useToast } from '@/components/ui/use-toast';
import { PageHeader, HeaderActionButton } from '@/components/ui/page-header';

const CollectionsPage: React.FC = () => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [filteredCollections, setFilteredCollections] = useState<Collection[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'alphabetical' | 'recent'>('alphabetical');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Form state for creating/editing collections
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3b82f6', // Default blue color
    imageUrl: ''
  });
  
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Load collections on component mount
  useEffect(() => {
    loadCollections();
  }, []);
  
  // Filter and sort collections when collections, searchQuery, or sortOrder changes
  useEffect(() => {
    filterAndSortCollections();
  }, [collections, searchQuery, sortOrder]);
  
  // Load collections from repository
  const loadCollections = async () => {
    setIsLoading(true);
    try {
      const allCollections = await collectionRepository.getAll();
      setCollections(allCollections);
      
      // Create default "Favorites" collection if it doesn't exist
      if (!allCollections.some(c => c.name.toLowerCase() === 'favorites')) {
        await collectionRepository.createDefaultFavoritesCollection();
        // Reload collections to include the new Favorites collection
        const updatedCollections = await collectionRepository.getAll();
        setCollections(updatedCollections);
      }
    } catch (error) {
      console.error('Error loading collections:', error);
      toast({
        title: 'Error',
        description: 'Failed to load collections. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Filter and sort collections based on search query and sort order
  const filterAndSortCollections = () => {
    let filtered = [...collections];
    
    // Apply search filter if query exists
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(collection => 
        collection.name.toLowerCase().includes(query) || 
        (collection.description && collection.description.toLowerCase().includes(query))
      );
    }
    
    // Apply sorting
    if (sortOrder === 'alphabetical') {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortOrder === 'recent') {
      filtered.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    }
    
    setFilteredCollections(filtered);
  };
  
  // Handle creating a new collection
  const handleCreateCollection = async () => {
    if (!formData.name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Collection name is required.',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      const now = new Date();
      const newCollection = await collectionRepository.add({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        color: formData.color,
        imageUrl: formData.imageUrl.trim() || undefined,
        bookIds: []
      });
      
      toast({
        title: 'Success',
        description: 'Collection created successfully!'
      });
      
      // Reset form and close dialog
      setFormData({
        name: '',
        description: '',
        color: '#3b82f6',
        imageUrl: ''
      });
      setIsCreateDialogOpen(false);
      
      // Reload collections
      await loadCollections();
    } catch (error) {
      console.error('Error creating collection:', error);
      toast({
        title: 'Error',
        description: 'Failed to create collection. Please try again.',
        variant: 'destructive'
      });
    }
  };
  
  // Handle editing a collection
  const handleEditCollection = async () => {
    if (!selectedCollection || !formData.name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Collection name is required.',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      await collectionRepository.update(selectedCollection.id, {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        color: formData.color,
        imageUrl: formData.imageUrl.trim() || undefined
      });
      
      toast({
        title: 'Success',
        description: 'Collection updated successfully!'
      });
      
      // Reset form and close dialog
      setFormData({
        name: '',
        description: '',
        color: '#3b82f6',
        imageUrl: ''
      });
      setIsEditDialogOpen(false);
      setSelectedCollection(null);
      
      // Reload collections
      await loadCollections();
    } catch (error) {
      console.error('Error updating collection:', error);
      toast({
        title: 'Error',
        description: 'Failed to update collection. Please try again.',
        variant: 'destructive'
      });
    }
  };
  
  // Handle deleting a collection
  const handleDeleteCollection = async () => {
    if (!selectedCollection) return;
    
    try {
      await collectionRepository.delete(selectedCollection.id);
      
      toast({
        title: 'Success',
        description: 'Collection deleted successfully!'
      });
      
      setIsDeleteDialogOpen(false);
      setSelectedCollection(null);
      
      // Reload collections
      await loadCollections();
    } catch (error) {
      console.error('Error deleting collection:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete collection. Please try again.',
        variant: 'destructive'
      });
    }
  };
  
  // Open edit dialog with selected collection data
  const openEditDialog = (collection: Collection) => {
    setSelectedCollection(collection);
    setFormData({
      name: collection.name,
      description: collection.description || '',
      color: collection.color || '#3b82f6',
      imageUrl: collection.imageUrl || ''
    });
    setIsEditDialogOpen(true);
  };
  
  // Open delete confirmation dialog
  const openDeleteDialog = (collection: Collection) => {
    setSelectedCollection(collection);
    setIsDeleteDialogOpen(true);
  };
  
  // Navigate to collection details page
  const navigateToCollection = (collectionId: string) => {
    navigate(`/collections/${collectionId}`);
  };
  
  // Render collection card for grid view
  const renderCollectionCard = (collection: Collection) => {
    const bookCount = collection.bookIds.length;
    const isFavorites = collection.name.toLowerCase() === 'favorites';
    
    return (
      <Card 
        key={collection.id}
        className="flex flex-col overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
        style={{ borderLeft: `4px solid ${collection.color || '#3b82f6'}` }}
      >
        <div 
          className="h-32 bg-cover bg-center relative"
          style={{ 
            backgroundColor: collection.color || '#3b82f6',
            backgroundImage: collection.imageUrl ? `url(${collection.imageUrl})` : 'none'
          }}
          onClick={() => navigateToCollection(collection.id)}
        >
          {!collection.imageUrl && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-white text-4xl font-bold opacity-30">
                {collection.name.substring(0, 2).toUpperCase()}
              </span>
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
            <h3 className="text-white font-semibold truncate">{collection.name}</h3>
          </div>
        </div>
        
        <div className="p-4 flex-grow">
          {collection.description && (
            <p className="text-sm text-gray-600 line-clamp-2 mb-2">{collection.description}</p>
          )}
          <p className="text-sm text-gray-500">
            {bookCount} {bookCount === 1 ? 'book' : 'books'}
          </p>
        </div>
        
        <div className="p-3 border-t flex justify-end gap-2">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              openEditDialog(collection);
            }}
          >
            <Edit size={16} />
          </Button>
          
          {!isFavorites && (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                openDeleteDialog(collection);
              }}
            >
              <Trash2 size={16} />
            </Button>
          )}
        </div>
      </Card>
    );
  };
  
  // Render collection row for list view
  const renderCollectionRow = (collection: Collection) => {
    const bookCount = collection.bookIds.length;
    const isFavorites = collection.name.toLowerCase() === 'favorites';
    
    return (
      <div 
        key={collection.id}
        className="flex items-center border-b py-3 hover:bg-gray-50"
        onClick={() => navigateToCollection(collection.id)}
      >
        <div 
          className="w-10 h-10 rounded-full mr-4 flex items-center justify-center"
          style={{ backgroundColor: collection.color || '#3b82f6' }}
        >
          {collection.imageUrl ? (
            <img 
              src={collection.imageUrl} 
              alt={collection.name} 
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <span className="text-white font-semibold">
              {collection.name.substring(0, 2).toUpperCase()}
            </span>
          )}
        </div>
        
        <div className="flex-grow">
          <h3 className="font-medium">{collection.name}</h3>
          {collection.description && (
            <p className="text-sm text-gray-600 truncate">{collection.description}</p>
          )}
        </div>
        
        <div className="text-sm text-gray-500 mx-4">
          {bookCount} {bookCount === 1 ? 'book' : 'books'}
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              openEditDialog(collection);
            }}
          >
            <Edit size={16} />
          </Button>
          
          {!isFavorites && (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                openDeleteDialog(collection);
              }}
            >
              <Trash2 size={16} />
            </Button>
          )}
        </div>
      </div>
    );
  };
  
  return (
    <div className="container mx-auto">
      <PageHeader
        title="My Collections"
        subtitle="Organize your books into custom collections"
        backTo="/"
        backAriaLabel="Back to Library"
        actions={
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus size={16} className="mr-2" />
            New Collection
          </Button>
        }
      >
        <div className="flex flex-col md:flex-row gap-4 mb-6 mt-4">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <Input
              placeholder="Search collections..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2">
            <Select
              value={sortOrder}
              onValueChange={(value) => setSortOrder(value as 'alphabetical' | 'recent')}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alphabetical">Alphabetical</SelectItem>
                <SelectItem value="recent">Recently Updated</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="flex border rounded-md">
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
        
        <div className="py-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredCollections.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-600 mb-2">No collections found</h3>
              <p className="text-gray-500">
                {searchQuery ? 'Try a different search term' : 'Create your first collection to get started'}
              </p>
              {!searchQuery && (
                <Button className="mt-4" onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus size={16} className="mr-2" />
                  Create Collection
                </Button>
              )}
            </div>
          ) : (
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-2'}>
              {filteredCollections.map(collection => 
                viewMode === 'grid' 
                  ? renderCollectionCard(collection) 
                  : renderCollectionRow(collection)
              )}
            </div>
          )}
        </div>
      </PageHeader>
      
      {/* Create Collection Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Collection</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="Collection name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="Describe your collection"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  id="color"
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
              <Label htmlFor="imageUrl">Image URL (optional)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="imageUrl"
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
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateCollection}>Create Collection</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
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
            <p>Are you sure you want to delete "{selectedCollection?.name}"?</p>
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
    </div>
  );
};

export default CollectionsPage;
