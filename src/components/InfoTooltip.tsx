import * as React from "react";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { createLogger } from "@/utils/loggingUtils";

interface InfoTooltipProps {
  /** Content to show in the tooltip */
  content: React.ReactNode;
  /** Optional class name for the trigger icon */
  className?: string;
  /** Tooltip delay in ms */
  delayDuration?: number;
}

/**
 * A tooltip component with an info icon that shows information on hover
 */
export const InfoTooltip: React.FC<InfoTooltipProps> = ({ 
  content, 
  className = "",
  delayDuration = 300
}) => {
  const log = createLogger('InfoTooltip');
  
  React.useEffect(() => {
    log.trace('InfoTooltip component rendered');
  }, [log]);

  return (
    <TooltipProvider>
      <Tooltip delayDuration={delayDuration}>
        <TooltipTrigger asChild>
          <span className={`inline-flex cursor-help ${className}`} aria-label="More information">
            <Info className="h-4 w-4 text-muted-foreground" />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs p-2 text-sm">
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
