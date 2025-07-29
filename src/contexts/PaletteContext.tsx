import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useStorage } from '@/hooks/useStorage';

export interface Palette {
  id: string; // Based on book title or custom ID
  title: string;
  coverPath: string;
  colors: string[]; // Hexcodes array
  isCustom?: boolean; // Flag to identify custom palettes
}

interface PaletteContextType {
  palettes: Palette[];
  customPalettes: Palette[];
  selectedPalette: Palette | null;
  selectPalette: (paletteId: string) => void;
  createCustomPalette: (title: string, colors: string[]) => Promise<Palette>;
  updateCustomPalette: (id: string, title: string, colors: string[]) => Promise<Palette | null>;
  deleteCustomPalette: (id: string) => Promise<boolean>;
  loading: boolean;
  error: Error | null;
}

const PaletteContext = createContext<PaletteContextType | undefined>(undefined);

export const usePalette = () => {
  const context = useContext(PaletteContext);
  if (context === undefined) {
    throw new Error('usePalette must be used within a PaletteProvider');
  }
  return context;
};

interface PaletteProviderProps {
  children: ReactNode;
}

export const PaletteProvider: React.FC<PaletteProviderProps> = ({ children }) => {
  const [palettes, setPalettes] = useState<Palette[]>([]);
  const [customPalettes, setCustomPalettes] = useState<Palette[]>([]);
  const [selectedPalette, setSelectedPalette] = useState<Palette | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();
  const { getItem, setItem } = useStorage();
  
  // Load palettes from palette.json and custom palettes from localStorage
  useEffect(() => {
    const loadPalettes = async () => {
      try {
        setLoading(true);
        
        // Load predefined palettes
        const response = await fetch('/covers/palette.json');
        if (!response.ok) {
          throw new Error('Failed to load color palettes');
        }
        
        const data = await response.json();
        
        // Transform the data to match our Palette interface
        const loadedPalettes: Palette[] = data.map((item: any) => ({
          id: item.title.replace(/\s+/g, '-').toLowerCase(),
          title: item.title,
          coverPath: item.cover,
          colors: item.hexcodes,
          isCustom: false
        }));
        
        setPalettes(loadedPalettes);
        
        // Load custom palettes from localStorage
        const savedCustomPalettes = await getItem('customPalettes');
        if (savedCustomPalettes) {
          try {
            const parsedCustomPalettes = JSON.parse(savedCustomPalettes);
            setCustomPalettes(parsedCustomPalettes);
          } catch (parseError) {
            console.error('Error parsing custom palettes:', parseError);
            setCustomPalettes([]);
          }
        }
        
        // Try to restore selected palette from storage
        const savedPaletteId = await getItem('selectedPaletteId');
        if (savedPaletteId) {
          // Check in both predefined and custom palettes
          const allPalettes = [...loadedPalettes, ...(savedCustomPalettes ? JSON.parse(savedCustomPalettes) : [])];
          const savedPalette = allPalettes.find(p => p.id === savedPaletteId);
          
          if (savedPalette) {
            setSelectedPalette(savedPalette);
          } else {
            // If saved palette not found, select first palette
            setSelectedPalette(loadedPalettes[0] || null);
          }
        } else {
          // If no saved palette, select first palette
          setSelectedPalette(loadedPalettes[0] || null);
        }
      } catch (err) {
        console.error('Error loading palettes:', err);
        setError(err instanceof Error ? err : new Error('Unknown error loading palettes'));
        toast({
          title: 'Error Loading Palettes',
          description: 'Failed to load color palettes. Using default palette instead.',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadPalettes();
  }, [getItem, toast]);
  
  const selectPalette = async (paletteId: string) => {
    // Look for the palette in both predefined and custom palettes
    const allPalettes = [...palettes, ...customPalettes];
    const palette = allPalettes.find(p => p.id === paletteId);
    
    if (palette) {
      setSelectedPalette(palette);
      // Save selection to storage
      try {
        await setItem('selectedPaletteId', paletteId);
      } catch (err) {
        console.error('Error saving palette selection:', err);
        toast({
          title: 'Error Saving Preference',
          description: 'Your palette selection could not be saved.',
          variant: 'destructive'
        });
      }
    }
  };
  
  // Generate a unique ID for custom palettes
  const generateCustomId = (title: string): string => {
    const baseId = `custom-${title.toLowerCase().replace(/\s+/g, '-')}`;
    const timestamp = Date.now();
    return `${baseId}-${timestamp}`;
  };
  
  // Create a new custom palette
  const createCustomPalette = async (title: string, colors: string[]): Promise<Palette> => {
    // Create a new custom palette object
    const newPalette: Palette = {
      id: generateCustomId(title),
      title,
      coverPath: '/covers/custom-palette.png', // Default cover for custom palettes
      colors,
      isCustom: true
    };
    
    // Add to custom palettes
    const updatedCustomPalettes = [...customPalettes, newPalette];
    setCustomPalettes(updatedCustomPalettes);
    
    // Save to localStorage
    try {
      await setItem('customPalettes', JSON.stringify(updatedCustomPalettes));
      toast({
        title: 'Custom Palette Created',
        description: `Your custom palette "${title}" has been created.`,
        variant: 'default'
      });
    } catch (err) {
      console.error('Error saving custom palette:', err);
      toast({
        title: 'Error Saving Palette',
        description: 'Your custom palette could not be saved.',
        variant: 'destructive'
      });
    }
    
    return newPalette;
  };
  
  // Update an existing custom palette
  const updateCustomPalette = async (id: string, title: string, colors: string[]): Promise<Palette | null> => {
    // Find the palette to update
    const paletteIndex = customPalettes.findIndex(p => p.id === id);
    
    if (paletteIndex === -1) {
      toast({
        title: 'Palette Not Found',
        description: 'The palette you are trying to update could not be found.',
        variant: 'destructive'
      });
      return null;
    }
    
    // Create updated palette
    const updatedPalette: Palette = {
      ...customPalettes[paletteIndex],
      title,
      colors
    };
    
    // Update the custom palettes array
    const updatedCustomPalettes = [...customPalettes];
    updatedCustomPalettes[paletteIndex] = updatedPalette;
    setCustomPalettes(updatedCustomPalettes);
    
    // If this was the selected palette, update it
    if (selectedPalette?.id === id) {
      setSelectedPalette(updatedPalette);
    }
    
    // Save to localStorage
    try {
      await setItem('customPalettes', JSON.stringify(updatedCustomPalettes));
      toast({
        title: 'Custom Palette Updated',
        description: `Your custom palette "${title}" has been updated.`,
        variant: 'default'
      });
    } catch (err) {
      console.error('Error updating custom palette:', err);
      toast({
        title: 'Error Updating Palette',
        description: 'Your custom palette could not be updated.',
        variant: 'destructive'
      });
    }
    
    return updatedPalette;
  };
  
  // Delete a custom palette
  const deleteCustomPalette = async (id: string): Promise<boolean> => {
    // Find the palette to delete
    const paletteIndex = customPalettes.findIndex(p => p.id === id);
    
    if (paletteIndex === -1) {
      toast({
        title: 'Palette Not Found',
        description: 'The palette you are trying to delete could not be found.',
        variant: 'destructive'
      });
      return false;
    }
    
    // Remove from custom palettes
    const updatedCustomPalettes = customPalettes.filter(p => p.id !== id);
    setCustomPalettes(updatedCustomPalettes);
    
    // If this was the selected palette, select the first available palette
    if (selectedPalette?.id === id) {
      const firstAvailablePalette = palettes[0] || updatedCustomPalettes[0] || null;
      setSelectedPalette(firstAvailablePalette);
      await setItem('selectedPaletteId', firstAvailablePalette?.id || '');
    }
    
    // Save to localStorage
    try {
      await setItem('customPalettes', JSON.stringify(updatedCustomPalettes));
      toast({
        title: 'Custom Palette Deleted',
        description: 'Your custom palette has been deleted.',
        variant: 'default'
      });
      return true;
    } catch (err) {
      console.error('Error deleting custom palette:', err);
      toast({
        title: 'Error Deleting Palette',
        description: 'Your custom palette could not be deleted.',
        variant: 'destructive'
      });
      return false;
    }
  };
  
  return (
    <PaletteContext.Provider value={{ 
      palettes, 
      customPalettes,
      selectedPalette, 
      selectPalette,
      createCustomPalette,
      updateCustomPalette,
      deleteCustomPalette, 
      loading, 
      error 
    }}>
      {children}
    </PaletteContext.Provider>
  );
};

export default PaletteProvider;
