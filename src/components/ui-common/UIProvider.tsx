import React from 'react';
import { ThemeProvider } from './ThemeProvider';
import { LayoutManager } from './LayoutManager';
import { AccessibilityManager } from './AccessibilityManager';
import { Toaster } from '../ui/toaster';

interface UIProviderProps {
  children: React.ReactNode;
}

/**
 * UIProvider combines all UI-related providers into a single component.
 * This includes theme management, layout responsiveness, and accessibility features.
 */
export function UIProvider({ children }: UIProviderProps) {
  return (
    <ThemeProvider>
      <LayoutManager>
        <AccessibilityManager>
          {children}
          <Toaster />
        </AccessibilityManager>
      </LayoutManager>
    </ThemeProvider>
  );
}

/**
 * Re-export hooks from individual providers for easy access
 */
export { useTheme } from './ThemeProvider';
export { useLayout } from './LayoutManager';
export { useAccessibility } from './AccessibilityManager';
export { useToast } from '../ui/use-toast';
