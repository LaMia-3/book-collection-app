import React, { createContext, useContext, useEffect, useState } from 'react';
import { debounce } from 'lodash-es';

// Breakpoint definitions matching Tailwind
export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

// Breakpoint pixel values (should match tailwind.config.ts)
const breakpointValues: Record<Breakpoint, number> = {
  'xs': 480,
  'sm': 640,
  'md': 768,
  'lg': 1024,
  'xl': 1280,
  '2xl': 1536,
};

interface LayoutContextType {
  currentBreakpoint: Breakpoint;
  isAtLeast: (breakpoint: Breakpoint) => boolean;
  isAtMost: (breakpoint: Breakpoint) => boolean;
  isBreakpoint: (breakpoint: Breakpoint) => boolean;
  windowWidth: number;
  windowHeight: number;
  isResizing: boolean;
}

const LayoutContext = createContext<LayoutContextType>({
  currentBreakpoint: 'md',
  isAtLeast: () => false,
  isAtMost: () => false,
  isBreakpoint: () => false,
  windowWidth: typeof window !== 'undefined' ? window.innerWidth : 0,
  windowHeight: typeof window !== 'undefined' ? window.innerHeight : 0,
  isResizing: false,
});

export function useLayout() {
  return useContext(LayoutContext);
}

interface LayoutManagerProps {
  children: React.ReactNode;
}

export function LayoutManager({ children }: LayoutManagerProps) {
  const [windowWidth, setWindowWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 0
  );
  const [windowHeight, setWindowHeight] = useState<number>(
    typeof window !== 'undefined' ? window.innerHeight : 0
  );
  const [currentBreakpoint, setCurrentBreakpoint] = useState<Breakpoint>('md');
  const [isResizing, setIsResizing] = useState<boolean>(false);

  // Determine the current breakpoint based on window width
  const determineBreakpoint = (width: number): Breakpoint => {
    if (width < breakpointValues.sm) return 'xs';
    if (width < breakpointValues.md) return 'sm';
    if (width < breakpointValues.lg) return 'md';
    if (width < breakpointValues.xl) return 'lg';
    if (width < breakpointValues['2xl']) return 'xl';
    return '2xl';
  };

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setWindowWidth(width);
      setWindowHeight(height);
      setCurrentBreakpoint(determineBreakpoint(width));
    };

    // Initial setup
    handleResize();
    
    // Create debounced resize handler that updates dimensions
    const debouncedHandleResize = debounce(handleResize, 100);
    
    // Create immediate resize start handler that sets the resizing flag
    const handleResizeStart = () => {
      setIsResizing(true);
      debouncedHandleResize();
    };
    
    // Create debounced resize end handler that clears the resizing flag
    const handleResizeEnd = debounce(() => {
      setIsResizing(false);
    }, 200);

    // Add event listeners
    window.addEventListener('resize', handleResizeStart);
    window.addEventListener('resize', handleResizeEnd);
    
    // Clean up
    return () => {
      window.removeEventListener('resize', handleResizeStart);
      window.removeEventListener('resize', handleResizeEnd);
      debouncedHandleResize.cancel();
      handleResizeEnd.cancel();
    };
  }, []);

  // Utility functions for breakpoint comparisons
  const isAtLeast = (breakpoint: Breakpoint): boolean => {
    const currentValue = breakpointValues[currentBreakpoint];
    const compareValue = breakpointValues[breakpoint];
    return currentValue >= compareValue;
  };

  const isAtMost = (breakpoint: Breakpoint): boolean => {
    const currentValue = breakpointValues[currentBreakpoint];
    const compareValue = breakpointValues[breakpoint];
    return currentValue <= compareValue;
  };

  const isBreakpoint = (breakpoint: Breakpoint): boolean => {
    return currentBreakpoint === breakpoint;
  };

  const layoutContextValue: LayoutContextType = {
    currentBreakpoint,
    isAtLeast,
    isAtMost,
    isBreakpoint,
    windowWidth,
    windowHeight,
    isResizing,
  };

  return (
    <LayoutContext.Provider value={layoutContextValue}>
      {children}
    </LayoutContext.Provider>
  );
}
