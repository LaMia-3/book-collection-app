import React, { useState, useEffect } from 'react';
import { usePalette } from '@/contexts/PaletteContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertCircle, Check, Trash2, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CustomPaletteEditorProps {
  isOpen: boolean;
  onClose: () => void;
  editingPalette?: {
    id: string;
    title: string;
    colors: string[];
  } | null;
}

export const CustomPaletteEditor: React.FC<CustomPaletteEditorProps> = ({ 
  isOpen, 
  onClose,
  editingPalette = null
}) => {
  const { createCustomPalette, updateCustomPalette } = usePalette();
  const [title, setTitle] = useState('');
  const [colors, setColors] = useState<string[]>(['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6']);
  const [activeColorIndex, setActiveColorIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Reset form when dialog opens/closes or editing palette changes
  useEffect(() => {
    if (isOpen) {
      if (editingPalette) {
        setTitle(editingPalette.title);
        setColors(editingPalette.colors.slice(0, 5));
        // Ensure we have exactly 5 colors
        if (editingPalette.colors.length < 5) {
          const defaultColors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6'];
          const additionalColors = defaultColors.slice(0, 5 - editingPalette.colors.length);
          setColors([...editingPalette.colors, ...additionalColors]);
        }
      } else {
        setTitle('');
        setColors(['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6']);
      }
      setActiveColorIndex(0);
      setError(null);
    }
  }, [isOpen, editingPalette]);
  
  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColors = [...colors];
    newColors[activeColorIndex] = e.target.value;
    setColors(newColors);
  };
  
  const handleSubmit = async () => {
    // Validate form
    if (!title.trim()) {
      setError('Please enter a palette name');
      return;
    }
    
    if (colors.length !== 5) {
      setError('Please select 5 colors for your palette');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      if (editingPalette) {
        // Update existing palette
        await updateCustomPalette(editingPalette.id, title, colors);
      } else {
        // Create new palette
        await createCustomPalette(title, colors);
      }
      onClose();
    } catch (err) {
      console.error('Error saving palette:', err);
      setError('Failed to save palette. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editingPalette ? 'Edit Custom Palette' : 'Create Custom Palette'}
          </DialogTitle>
          <DialogDescription>
            Select 5 colors to create your custom palette for book spines.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Palette Name */}
          <div className="space-y-2">
            <Label htmlFor="palette-name">Palette Name</Label>
            <Input 
              id="palette-name"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My Custom Palette"
            />
          </div>
          
          {/* Color Preview */}
          <div className="space-y-2">
            <Label>Palette Preview</Label>
            <div className="flex justify-center gap-2 p-4 bg-muted rounded-md">
              {colors.map((color, index) => (
                <div 
                  key={index}
                  className={`w-12 h-20 cursor-pointer transition-all ${
                    activeColorIndex === index ? 'ring-2 ring-primary scale-110' : ''
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setActiveColorIndex(index)}
                >
                  {activeColorIndex === index && (
                    <div className="flex justify-center items-center h-full">
                      <Check className="h-4 w-4 text-white drop-shadow-md" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {/* Color Picker */}
          <div className="space-y-2">
            <Label htmlFor="color-picker">
              Select Color {activeColorIndex + 1}
            </Label>
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-md border"
                style={{ backgroundColor: colors[activeColorIndex] }}
              />
              <Input
                id="color-picker"
                type="color"
                value={colors[activeColorIndex]}
                onChange={handleColorChange}
                className="w-full h-10"
              />
            </div>
          </div>
          
          {/* Book Spine Preview */}
          <div className="space-y-2">
            <Label>Book Spine Preview</Label>
            <div className="flex justify-center p-4 bg-muted rounded-md">
              <div 
                className="w-16 h-40 rounded-sm shadow-md flex items-center justify-center"
                style={{ backgroundColor: colors[activeColorIndex] }}
              >
                <span className="text-white text-xs font-medium text-center px-2 rotate-90">
                  Sample Book Title
                </span>
              </div>
            </div>
          </div>
          
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
        
        <DialogFooter className="sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button 
            type="button" 
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            <Check className="mr-2 h-4 w-4" />
            {editingPalette ? 'Update Palette' : 'Create Palette'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CustomPaletteEditor;
