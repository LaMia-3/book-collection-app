import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ReadOnlyFieldProps {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  className?: string;
  labelClassName?: string;
  valueClassName?: string;
  iconClassName?: string;
}

/**
 * ReadOnlyField component for displaying fields in view mode
 * Provides a consistent layout for field labels and values in the BookDetails view mode
 */
export function ReadOnlyField({
  label,
  value,
  icon,
  className,
  labelClassName,
  valueClassName,
  iconClassName,
}: ReadOnlyFieldProps) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex items-center gap-1.5">
        {icon && (
          <span className={cn("text-muted-foreground", iconClassName)}>
            {icon}
          </span>
        )}
        <span className={cn("text-sm font-medium text-muted-foreground", labelClassName)}>
          {label}
        </span>
      </div>
      <div className={cn("text-base", valueClassName)}>
        {value || <span className="italic text-muted-foreground text-sm">Not specified</span>}
      </div>
    </div>
  );
}
