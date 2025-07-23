import React from 'react';
import { usePalette } from '@/contexts/PaletteContext';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

export const PaletteSelector: React.FC = () => {
  const { palettes, selectedPalette, selectPalette, loading } = usePalette();

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

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Current Palette</h3>
        {selectedPalette && (
          <div className="bg-background border rounded-md p-4 flex flex-col sm:flex-row items-center gap-4">
            <div className="w-24 h-36 flex-shrink-0">
              <img 
                src={selectedPalette.coverPath} 
                alt={selectedPalette.title} 
                className="w-full h-full object-cover rounded-sm shadow-sm"
              />
            </div>
            <div className="flex-1">
              <h4 className="font-medium mb-2">{selectedPalette.title}</h4>
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
        <h3 className="text-lg font-semibold mb-2">Available Palettes</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Select a book cover to apply its color palette to your bookshelf.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 max-h-[400px] overflow-y-auto p-1">
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
        </div>
      </div>
    </div>
  );
};

export default PaletteSelector;
