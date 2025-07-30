import React, { useState } from 'react';
import { Series } from '@/types/series';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pencil, Save, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SeriesInfoTabProps {
  series: Series;
}

/**
 * Tab for displaying and editing series information
 */
export const SeriesInfoTab = ({ series }: SeriesInfoTabProps) => {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editedSeries, setEditedSeries] = useState({ ...series });
  const [isSaving, setIsSaving] = useState(false);
  
  // Handle save
  const handleSave = () => {
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
      
      // Update in localStorage
      const savedSeries = localStorage.getItem("seriesLibrary");
      if (savedSeries) {
        const parsedSeries = JSON.parse(savedSeries) as Series[];
        const updatedSeriesList = parsedSeries.map(s => 
          s.id === series.id ? { ...editedSeries, updatedAt: new Date() } : s
        );
        localStorage.setItem("seriesLibrary", JSON.stringify(updatedSeriesList));
        
        toast({
          title: "Changes saved",
          description: "Series information has been updated."
        });
        
        setIsEditing(false);
        
        // In a real app, we would refetch the data here
        // For now, just reload the page after a short delay
        setTimeout(() => window.location.reload(), 500);
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
