import React, { useState } from 'react';
import { usePalette, Palette } from '@/contexts/PaletteContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Check, Plus, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { CustomPaletteEditor } from '@/components/CustomPaletteEditor';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export const PaletteSelector: React.FC = () => {
  const { palettes, customPalettes, selectedPalette, selectPalette, deleteCustomPalette, loading } = usePalette();
  
  // State for custom palette editor
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingPalette, setEditingPalette] = useState<Palette | null>(null);
  
  // State for delete confirmation
  const [paletteToDelete, setPaletteToDelete] = useState<Palette | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-pulse flex space-x-4">
          <div className="rounded-full bg-slate-200 h-10 w-10"></div>
          <div className="flex-1 space-y-6 py-1">
            <div className="h-2 bg-slate-200 rounded"></div>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-4">
                <div className="h-2 bg-slate-200 rounded col-span-2"></div>
                <div className="h-2 bg-slate-200 rounded col-span-1"></div>
              </div>
              <div className="h-2 bg-slate-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const openEditor = (palette: Palette | null = null) => {
    setEditingPalette(palette);
    setIsEditorOpen(true);
  };
  
  const confirmDelete = (palette: Palette) => {
    setPaletteToDelete(palette);
    setShowDeleteConfirm(true);
  };
  
  const handleDelete = async () => {
    if (paletteToDelete) {
      await deleteCustomPalette(paletteToDelete.id);
      setShowDeleteConfirm(false);
      setPaletteToDelete(null);
    }
  };

  // Combine predefined and custom palettes
  const allPalettes = [...palettes, ...customPalettes];

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Current Palette</h3>
        {selectedPalette && (
          <div className="bg-background border rounded-md p-4 flex flex-col sm:flex-row items-center gap-4">
            <div className="w-24 h-36 flex-shrink-0">
              {selectedPalette.isCustom ? (
                <div 
                  className="w-full h-full rounded-sm shadow-sm flex items-center justify-center bg-muted"
                >
                  <div className="flex flex-col items-center justify-center p-2">
                    {selectedPalette.colors.map((color, index) => (
                      <div 
                        key={`${selectedPalette.id}-preview-${index}`} 
                        className="w-full h-4 mb-1"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <img 
                  src={selectedPalette.coverPath} 
                  alt={selectedPalette.title} 
                  className="w-full h-full object-cover rounded-sm shadow-sm"
                />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="font-medium mb-2">{selectedPalette.title}</h4>
                {selectedPalette.isCustom && (
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => openEditor(selectedPalette)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => confirmDelete(selectedPalette)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
              <div className="flex gap-2 flex-wrap">
                {selectedPalette.colors.map((color, index) => (
                  <div 
                    key={`${selectedPalette.id}-color-${index}`} 
                    className="w-8 h-8 rounded-full border shadow-sm"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold">Available Palettes</h3>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => openEditor()}
            className="flex items-center gap-1"
          >
            <Plus className="h-4 w-4" />
            Create Custom
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Select a book cover or custom palette to apply its colors to your bookshelf.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 max-h-[400px] overflow-y-auto p-1">
          {/* Predefined Palettes */}
          {palettes.map((palette) => (
            <Card 
              key={palette.id} 
              className={cn(
                "relative cursor-pointer transition-all hover:scale-105 overflow-hidden",
                selectedPalette?.id === palette.id ? "ring-2 ring-primary" : "hover:ring-1 hover:ring-primary/50"
              )}
              onClick={() => selectPalette(palette.id)}
            >
              <div className="aspect-[2/3] relative">
                <img 
                  src={palette.coverPath} 
                  alt={palette.title} 
                  className="w-full h-full object-cover"
                />
                {selectedPalette?.id === palette.id && (
                  <div className="absolute top-2 right-2 bg-primary rounded-full p-1">
                    <Check className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                  <p className="text-xs text-white line-clamp-2 font-medium">
                    {palette.title}
                  </p>
                </div>
              </div>
              <div className="flex justify-center gap-1 p-2 bg-card">
                {palette.colors.map((color, index) => (
                  <div 
                    key={`${palette.id}-color-preview-${index}`} 
                    className="w-4 h-4 rounded-full border"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </Card>
          ))}
          
          {/* Custom Palettes */}
          {customPalettes.map((palette) => (
            <Card 
              key={palette.id} 
              className={cn(
                "relative cursor-pointer transition-all hover:scale-105 overflow-hidden",
                selectedPalette?.id === palette.id ? "ring-2 ring-primary" : "hover:ring-1 hover:ring-primary/50"
              )}
              onClick={() => selectPalette(palette.id)}
            >
              <div className="aspect-[2/3] relative bg-muted">
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                  {palette.colors.map((color, index) => (
                    <div 
                      key={`${palette.id}-custom-preview-${index}`} 
                      className="w-full h-8 mb-1"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                
                {selectedPalette?.id === palette.id && (
                  <div className="absolute top-2 right-2 bg-primary rounded-full p-1">
                    <Check className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
                
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                  <p className="text-xs text-white line-clamp-2 font-medium">
                    {palette.title}
                  </p>
                </div>
                
                {/* Edit and Delete buttons */}
                <div className="absolute top-2 left-2 flex gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 bg-black/30 hover:bg-black/50 text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditor(palette);
                    }}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-6 w-6 bg-black/30 hover:bg-black/50 text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      confirmDelete(palette);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div className="flex justify-center gap-1 p-2 bg-card">
                {palette.colors.map((color, index) => (
                  <div 
                    key={`${palette.id}-color-preview-${index}`} 
                    className="w-4 h-4 rounded-full border"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </Card>
          ))}
          
          {/* Create Custom Palette Card */}
          <Card 
            className="relative cursor-pointer transition-all hover:scale-105 overflow-hidden border-dashed"
            onClick={() => openEditor()}
          >
            <div className="aspect-[2/3] relative bg-muted/50 flex flex-col items-center justify-center">
              <Plus className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground text-center px-4">
                Create Custom Palette
              </p>
            </div>
          </Card>
        </div>
      </div>
      
      {/* Custom Palette Editor Dialog */}
      <CustomPaletteEditor 
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setEditingPalette(null);
        }}
        editingPalette={editingPalette}
      />
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Custom Palette
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the "{paletteToDelete?.title}" palette? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPaletteToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PaletteSelector;
