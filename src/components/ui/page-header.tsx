import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

type PageHeaderProps = {
  title: string;
  backTo?: string;
  backAriaLabel?: string;
  actions?: React.ReactNode;
  subtitle?: string;
  children?: React.ReactNode;
  className?: string;
  sticky?: boolean;
};

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  backTo,
  backAriaLabel = 'Go back',
  actions,
  subtitle,
  children,
  className,
  sticky = true,
}) => {
  return (
    <header
      className={cn(
        'px-4 py-3 bg-background border-b border-border',
        sticky && 'sticky top-0 z-10',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0 flex-grow">
          {backTo && (
            <Link
              to={backTo}
              aria-label={backAriaLabel}
              className="inline-flex items-center justify-center h-10 w-10 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </Link>
          )}
          
          <div className="min-w-0 overflow-hidden">
            <h1 className="text-xl font-bold truncate">{title}</h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
            )}
          </div>
        </div>
        
        {actions && (
          <div className="flex items-center gap-2 ml-2">
            {actions}
          </div>
        )}
      </div>
      
      {children && (
        <div className="mt-3">
          {children}
        </div>
      )}
    </header>
  );
};

// For more complex header actions, we can create a helper component
export const HeaderActionButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  to?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
}> = ({ icon, label, onClick, to, variant = 'ghost' }) => {
  const className = cn(
    'inline-flex items-center justify-center gap-1 h-9 rounded-md px-3 text-sm font-medium transition-colors',
    variant === 'primary' && 'bg-primary text-primary-foreground hover:bg-primary/90',
    variant === 'secondary' && 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    variant === 'ghost' && 'hover:bg-accent hover:text-accent-foreground'
  );
  
  if (to) {
    return (
      <Link to={to} className={className} aria-label={label}>
        {icon}
        <span className="sr-only md:not-sr-only">{label}</span>
      </Link>
    );
  }
  
  return (
    <button onClick={onClick} className={className} aria-label={label}>
      {icon}
      <span className="sr-only md:not-sr-only">{label}</span>
    </button>
  );
};
