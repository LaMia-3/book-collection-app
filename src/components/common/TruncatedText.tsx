import React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";

interface TruncatedTextProps {
  text: string;
  maxLength?: number;
  className?: string;
  lineClamp?: number;
  tooltipDisabled?: boolean;
}

export const TruncatedText: React.FC<TruncatedTextProps> = ({
  text,
  maxLength = 30,
  className = '',
  lineClamp,
  tooltipDisabled = false
}) => {
  const needsTruncation = text && (text.length > maxLength || lineClamp !== undefined);
  const shouldShowTooltip = needsTruncation && !tooltipDisabled;
  
  // Generate appropriate CSS classes based on props
  const cssClasses = [
    className,
    lineClamp ? `line-clamp-${lineClamp}` : '',
    !lineClamp && needsTruncation ? 'truncate' : '',
  ].filter(Boolean).join(' ');
  
  // If no truncation needed or tooltip disabled, just render the text
  if (!text || !shouldShowTooltip) {
    return <span className={cssClasses}>{text}</span>;
  }
  
  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <span className={cssClasses} aria-label={text}>
            {lineClamp ? text : text.length > maxLength ? `${text.slice(0, maxLength)}...` : text}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs break-words">{text}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
