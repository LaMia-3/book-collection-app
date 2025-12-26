import { LayoutGrid, List, Bookmark, BarChart, LibrarySquare, FolderOpen } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export type ViewMode = 'shelf' | 'list' | 'cover' | 'insights' | 'series' | 'collections';

interface ViewToggleProps {
  viewMode: ViewMode;
  onChange: (viewMode: ViewMode) => void;
}

export const ViewToggle = ({ viewMode, onChange }: ViewToggleProps) => {
  return (
    <TooltipProvider delayDuration={400}>
      <ToggleGroup 
        type="single" 
        value={viewMode}
        onValueChange={(value) => {
          if (value) onChange(value as ViewMode);
        }}
        className="border rounded-md"
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <ToggleGroupItem 
              value="shelf" 
              aria-label="Shelf View"
              className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              <Bookmark className="h-4 w-4" />
            </ToggleGroupItem>
          </TooltipTrigger>
          <TooltipContent>
            <p>Bookshelf View</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <ToggleGroupItem 
              value="list" 
              aria-label="List View"
              className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              <List className="h-4 w-4" />
            </ToggleGroupItem>
          </TooltipTrigger>
          <TooltipContent>
            <p>List View</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <ToggleGroupItem 
              value="cover" 
              aria-label="Cover View"
              className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              <LayoutGrid className="h-4 w-4" />
            </ToggleGroupItem>
          </TooltipTrigger>
          <TooltipContent>
            <p>Cover Grid View</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <ToggleGroupItem 
              value="insights" 
              aria-label="Insights View"
              className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              <BarChart className="h-4 w-4" />
            </ToggleGroupItem>
          </TooltipTrigger>
          <TooltipContent>
            <p>Reading Insights</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <ToggleGroupItem 
              value="series" 
              aria-label="Series View"
              className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              <LibrarySquare className="h-4 w-4" />
            </ToggleGroupItem>
          </TooltipTrigger>
          <TooltipContent>
            <p>Series View</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <ToggleGroupItem 
              value="collections" 
              aria-label="Collections View"
              className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              <FolderOpen className="h-4 w-4" />
            </ToggleGroupItem>
          </TooltipTrigger>
          <TooltipContent>
            <p>Collections View</p>
          </TooltipContent>
        </Tooltip>
      </ToggleGroup>
    </TooltipProvider>
  );
};
