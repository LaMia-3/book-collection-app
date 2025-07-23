import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useStorage } from '@/hooks/useStorage';

export interface Palette {
  id: string; // Based on book title
  title: string;
  coverPath: string;
  colors: string[]; // Hexcodes array
}

interface PaletteContextType {
  palettes: Palette[];
  selectedPalette: Palette | null;
  selectPalette: (paletteId: string) => void;
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
  const [selectedPalette, setSelectedPalette] = useState<Palette | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();
  const { getItem, setItem } = useStorage();
  
  // Load palettes from palette.json
  useEffect(() => {
    const loadPalettes = async () => {
      try {
        setLoading(true);
        const response = await fetch('/covers/palette.json');
        if (!response.ok) {
          throw new Error('Failed to load color palettes');
        }
        
        const data = await response.json();
        
        // Transform the data to match our Palette interface
        const loadedPalettes: Palette[] = data.map((item: any) => ({
          id: item.title.replace(/\\s+/g, '-').toLowerCase(),
          title: item.title,
          coverPath: item.cover,
          colors: item.hexcodes
        }));
        
        setPalettes(loadedPalettes);
        
        // Try to restore selected palette from storage
        const savedPaletteId = await getItem('selectedPaletteId');
        if (savedPaletteId) {
          const savedPalette = loadedPalettes.find(p => p.id === savedPaletteId);
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
    const palette = palettes.find(p => p.id === paletteId);
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
  
  return (
    <PaletteContext.Provider value={{ 
      palettes, 
      selectedPalette, 
      selectPalette, 
      loading, 
      error 
    }}>
      {children}
    </PaletteContext.Provider>
  );
};

export default PaletteProvider;
