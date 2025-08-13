/**
 * SeriesEditDialog Component
 * 
 * A dialog for editing series details in the Book Collection App
 */
import { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { Series } from '@/types/indexeddb/Series';
import { enhancedStorageService } from '@/services/storage/EnhancedStorageService';

interface SeriesEditDialogProps {
  series: Series;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedSeries: Series) => void;
}

export function SeriesEditDialog({ series, isOpen, onClose, onSave }: SeriesEditDialogProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [editedSeries, setEditedSeries] = useState<Series>({...series});
  
  // Update the form state when the series prop changes
  useEffect(() => {
    setEditedSeries({...series});
  }, [series]);
  
  const handleInputChange = (field: keyof Series, value: string | boolean | number) => {
    setEditedSeries(prev => ({
      ...prev,
      [field]: value,
      lastModified: new Date().toISOString()
    }));
  };
  
  const handleSave = async () => {
    if (!editedSeries.name.trim()) {
      toast({
        title: "Invalid series name",
        description: "Series name cannot be empty",
        variant: "destructive"
      });
      return;
    }
    
    setIsSaving(true);
    try {
      // Update the series in IndexedDB
      await enhancedStorageService.saveSeries(editedSeries);
      
      // Call the onSave callback with the updated series
      onSave(editedSeries);
      
      toast({
        title: "Series updated",
        description: "Series details have been saved"
      });
      
      // Close the dialog
      onClose();
      
    } catch (error) {
      console.error('Error saving series:', error);
      toast({
        title: "Error",
        description: "Failed to save series changes",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Edit Series</DialogTitle>
          <DialogDescription>
            Update details for {series.name}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              value={editedSeries.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="author" className="text-right">
              Author
            </Label>
            <Input
              id="author"
              value={editedSeries.author || ''}
              onChange={(e) => handleInputChange('author', e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="description" className="text-right pt-2">
              Description
            </Label>
            <Textarea
              id="description"
              value={editedSeries.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="col-span-3 min-h-[100px]"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="status" className="text-right">
              Status
            </Label>
            <select
              id="status"
              value={editedSeries.status || 'ongoing'}
              onChange={(e) => handleInputChange('status', e.target.value)}
              className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="hiatus">On Hiatus</option>
            </select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="totalBooks" className="text-right">
              Total Books
            </Label>
            <Input
              id="totalBooks"
              type="number"
              value={editedSeries.totalBooks || ''}
              onChange={(e) => handleInputChange('totalBooks', parseInt(e.target.value) || 0)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="coverImage" className="text-right">
              Cover Image URL
            </Label>
            <Input
              id="coverImage"
              value={editedSeries.coverImage || ''}
              onChange={(e) => handleInputChange('coverImage', e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="isTracked" className="text-right">
              Track Series
            </Label>
            <div className="flex items-center space-x-2 col-span-3">
              <Switch
                id="isTracked"
                checked={editedSeries.isTracked || false}
                onCheckedChange={(checked) => handleInputChange('isTracked', checked)}
              />
              <Label htmlFor="isTracked" className="text-sm text-muted-foreground">
                Get notifications for new releases
              </Label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
