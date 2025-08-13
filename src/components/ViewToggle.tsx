import { LayoutGrid, List, Bookmark, BarChart, LibrarySquare } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export type ViewMode = 'shelf' | 'list' | 'cover' | 'insights' | 'series';

interface ViewToggleProps {
  viewMode: ViewMode;
  onChange: (viewMode: ViewMode) => void;
}

export const ViewToggle = ({ viewMode, onChange }: ViewToggleProps) => {
  return (
    <ToggleGroup 
      type="single" 
      value={viewMode}
      onValueChange={(value) => {
        if (value) onChange(value as ViewMode);
      }}
      className="border rounded-md"
    >
      <ToggleGroupItem 
        value="shelf" 
        aria-label="Shelf View"
        className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
      >
        <Bookmark className="h-4 w-4" />
      </ToggleGroupItem>

      <ToggleGroupItem 
        value="list" 
        aria-label="List View"
        className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
      >
        <List className="h-4 w-4" />
      </ToggleGroupItem>

      <ToggleGroupItem 
        value="cover" 
        aria-label="Cover View"
        className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
      >
        <LayoutGrid className="h-4 w-4" />
      </ToggleGroupItem>

      <ToggleGroupItem 
        value="insights" 
        aria-label="Insights View"
        className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
      >
        <BarChart className="h-4 w-4" />
      </ToggleGroupItem>

      <ToggleGroupItem 
        value="series" 
        aria-label="Series View"
        className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
      >
        <LibrarySquare className="h-4 w-4" />
      </ToggleGroupItem>
    </ToggleGroup>
  );
};
