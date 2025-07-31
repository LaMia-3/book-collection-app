import React, { useState } from 'react';
import { Series } from '@/types/series';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pencil, Save, X, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { enhancedStorageService } from '@/services/storage/EnhancedStorageService';

interface SeriesInfoTabProps {
  series: Series;
  onSeriesUpdated?: (updatedSeries: Series) => void;
}

/**
 * Tab for displaying and editing series information
 */
export const SeriesInfoTab = ({ series, onSeriesUpdated }: SeriesInfoTabProps) => {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editedSeries, setEditedSeries] = useState({ ...series });
  const [isSaving, setIsSaving] = useState(false);
  
  // Handle save
  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      // Validate
      if (!editedSeries.name.trim()) {
        toast({
          title: "Invalid series name",
          description: "Series name cannot be empty.",
          variant: "destructive"
        });
        setIsSaving(false);
        return;
      }
      
      // Keep a copy of the series for UI updates - it uses the original UI Series type
      const uiUpdatedSeries: Series = {
        ...series, // Start with original series to ensure all fields are present
        ...editedSeries, // Override with edited values
        updatedAt: new Date(), // Update the timestamp
        // Ensure required fields are present
        books: editedSeries.books || series.books || [],
        isTracked: typeof editedSeries.isTracked === 'boolean' ? editedSeries.isTracked : series.isTracked,
        readingOrder: editedSeries.readingOrder || series.readingOrder || 'publication',
        createdAt: editedSeries.createdAt || series.createdAt || new Date()
      };
      
      // Save to IndexedDB (exclusive source of truth)
      await enhancedStorageService.initialize();
      
      // Create a proper IndexedDB Series object
      const indexedDBSeries = {
        id: series.id,
        name: editedSeries.name,
        description: editedSeries.description,
        author: editedSeries.author,
        coverImage: editedSeries.coverImage,
        books: editedSeries.books || series.books || [],
        totalBooks: editedSeries.books?.length || series.books?.length || 0,
        completedBooks: 0, // Default if not tracking
        readingProgress: 0, // Default if not tracking
        readingOrder: editedSeries.readingOrder || series.readingOrder || 'publication',
        customOrder: editedSeries.customOrder || series.customOrder,
        status: editedSeries.status || series.status,
        isTracked: typeof editedSeries.isTracked === 'boolean' ? editedSeries.isTracked : series.isTracked,
        dateAdded: series.dateAdded || new Date().toISOString(),
        lastModified: new Date().toISOString(),
        // Handle required fields not in the UI Series type but needed for IndexedDB
        categories: series.genre || [],
        apiEnriched: series.apiEnriched || false,
        hasUpcoming: series.hasUpcoming || false
      };
      
      // Log what we're about to save
      console.log('Saving series to IndexedDB:', indexedDBSeries);
      
      // Save to IndexedDB - the source of truth
      await enhancedStorageService.saveSeries(indexedDBSeries);
      
      console.log('Series saved successfully to IndexedDB');
      
      // No longer need to update localStorage as IndexedDB is now the exclusive source of truth
      
      toast({
        title: "Changes saved",
        description: "Series information has been updated."
      });
      
      setIsEditing(false);
      
      // Notify parent component if callback is provided
      if (onSeriesUpdated) {
        onSeriesUpdated(uiUpdatedSeries);
      }
    } catch (error) {
      console.error("Error saving series:", error);
      toast({
        title: "Error saving changes",
        description: "There was a problem saving your changes. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  // Format date
  const formatDate = (date: Date | string) => {
    if (!date) return "Unknown";
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  return (
    <div className="space-y-6">
      {!isEditing ? (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-medium">Series Information</h2>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
          </div>
          
          <div className="grid gap-6">
            {/* Series metadata */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Series Name</h3>
                <p className="text-foreground">{series.name}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Author</h3>
                <p className="text-foreground">{series.author || "Various Authors"}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Status</h3>
                <Badge variant={
                  series.status === 'completed' ? 'default' :
                  series.status === 'cancelled' ? 'destructive' : 'secondary'
                }>
                  {series.status || "Ongoing"}
                </Badge>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Default Reading Order</h3>
                <p className="text-foreground capitalize">{series.readingOrder || "Publication"}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Created</h3>
                <p className="text-foreground">{formatDate(series.createdAt)}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Last Updated</h3>
                <p className="text-foreground">{formatDate(series.updatedAt)}</p>
              </div>
            </div>
            
            {/* Description */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Description</h3>
              {series.description ? (
                <div className="prose prose-sm max-w-none">
                  <p>{series.description}</p>
                </div>
              ) : (
                <p className="text-muted-foreground italic">No description available</p>
              )}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-medium">Edit Series Information</h2>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsEditing(false)}
                disabled={isSaving}
                className="flex items-center gap-1"
              >
                <X className="h-4 w-4" />
                Cancel
              </Button>
              <Button 
                variant="default" 
                size="sm" 
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-1"
              >
                <Save className="h-4 w-4" />
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Series Name</Label>
                <Input
                  id="name"
                  value={editedSeries.name}
                  onChange={(e) => setEditedSeries({...editedSeries, name: e.target.value})}
                  placeholder="Enter series name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="author">Author</Label>
                <Input
                  id="author"
                  value={editedSeries.author || ""}
                  onChange={(e) => setEditedSeries({...editedSeries, author: e.target.value})}
                  placeholder="Enter author name (or leave blank for various)"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={editedSeries.status || "ongoing"}
                  onValueChange={(value) => setEditedSeries({...editedSeries, status: value as any})}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ongoing">Ongoing</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="readingOrder">Default Reading Order</Label>
                <Select
                  value={editedSeries.readingOrder}
                  onValueChange={(value) => setEditedSeries({...editedSeries, readingOrder: value as any})}
                >
                  <SelectTrigger id="readingOrder">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="publication">Publication Order</SelectItem>
                    <SelectItem value="chronological">Chronological Order</SelectItem>
                    <SelectItem value="custom">Custom Order</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editedSeries.description || ""}
                onChange={(e) => setEditedSeries({...editedSeries, description: e.target.value})}
                placeholder="Enter series description"
                rows={5}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};
