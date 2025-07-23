import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useTheme, AccessibilityMode } from './ThemeProvider';

interface AccessibilityContextType {
  announceToScreenReader: (message: string) => void;
  focusableElements: HTMLElement[];
  registerFocusableElement: (element: HTMLElement) => void;
  unregisterFocusableElement: (element: HTMLElement) => void;
  toggleHighContrast: () => void;
  toggleReducedMotion: () => void;
  increaseFontSize: () => void;
  decreaseFontSize: () => void;
  resetFontSize: () => void;
  isHighContrast: boolean;
  isReducedMotion: boolean;
}

const AccessibilityContext = createContext<AccessibilityContextType>({
  announceToScreenReader: () => {},
  focusableElements: [],
  registerFocusableElement: () => {},
  unregisterFocusableElement: () => {},
  toggleHighContrast: () => {},
  toggleReducedMotion: () => {},
  increaseFontSize: () => {},
  decreaseFontSize: () => {},
  resetFontSize: () => {},
  isHighContrast: false,
  isReducedMotion: false,
});

export function useAccessibility() {
  return useContext(AccessibilityContext);
}

interface AccessibilityManagerProps {
  children: React.ReactNode;
}

export function AccessibilityManager({ children }: AccessibilityManagerProps) {
  const { accessibilityMode, setAccessibilityMode, fontScale, setFontScale } = useTheme();
  const [focusableElements, setFocusableElements] = useState<HTMLElement[]>([]);
  const announcerRef = useRef<HTMLDivElement>(null);
  
  const isHighContrast = accessibilityMode === 'high-contrast';
  const isReducedMotion = accessibilityMode === 'reduced-motion';
  
  // Function to announce messages to screen readers
  const announceToScreenReader = (message: string) => {
    if (announcerRef.current) {
      announcerRef.current.textContent = '';
      // Force a DOM reflow
      void announcerRef.current.offsetWidth;
      announcerRef.current.textContent = message;
    }
  };
  
  // Functions to register and unregister focusable elements
  const registerFocusableElement = (element: HTMLElement) => {
    setFocusableElements((prev) => [...prev, element]);
  };
  
  const unregisterFocusableElement = (element: HTMLElement) => {
    setFocusableElements((prev) => prev.filter((el) => el !== element));
  };
  
  // Toggle accessibility modes
  const toggleHighContrast = () => {
    setAccessibilityMode(isHighContrast ? 'default' : 'high-contrast');
  };
  
  const toggleReducedMotion = () => {
    setAccessibilityMode(isReducedMotion ? 'default' : 'reduced-motion');
  };
  
  // Font size adjustment functions
  const increaseFontSize = () => {
    // Calculate new font scale but ensure it doesn't exceed 1.5
    const newScale = Math.min(fontScale + 0.1, 1.5);
    setFontScale(newScale);
  };
  
  const decreaseFontSize = () => {
    // Calculate new font scale but ensure it doesn't go below 0.8
    const newScale = Math.max(fontScale - 0.1, 0.8);
    setFontScale(newScale);
  };
  
  const resetFontSize = () => {
    setFontScale(1);
  };
  
  // Check for system-level preferences on mount
  useEffect(() => {
    // Check for prefers-reduced-motion
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reducedMotionQuery.matches) {
      setAccessibilityMode('reduced-motion');
    }
    
    // Check for prefers-contrast
    const highContrastQuery = window.matchMedia('(prefers-contrast: more)');
    if (highContrastQuery.matches) {
      setAccessibilityMode('high-contrast');
    }
    
    // Setup keyboard navigation listener for accessibility shortcuts
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only apply shortcuts when Alt key is pressed
      if (event.altKey) {
        switch (event.key) {
          case '=': // Alt+= to increase font size
            event.preventDefault();
            increaseFontSize();
            announceToScreenReader('Font size increased');
            break;
          case '-': // Alt+- to decrease font size
            event.preventDefault();
            decreaseFontSize();
            announceToScreenReader('Font size decreased');
            break;
          case '0': // Alt+0 to reset font size
            event.preventDefault();
            resetFontSize();
            announceToScreenReader('Font size reset');
            break;
          case 'c': // Alt+c to toggle high contrast
            event.preventDefault();
            toggleHighContrast();
            announceToScreenReader(`High contrast mode ${isHighContrast ? 'disabled' : 'enabled'}`);
            break;
          case 'm': // Alt+m to toggle reduced motion
            event.preventDefault();
            toggleReducedMotion();
            announceToScreenReader(`Reduced motion mode ${isReducedMotion ? 'disabled' : 'enabled'}`);
            break;
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isHighContrast, isReducedMotion]);
  
  const accessibilityContextValue: AccessibilityContextType = {
    announceToScreenReader,
    focusableElements,
    registerFocusableElement,
    unregisterFocusableElement,
    toggleHighContrast,
    toggleReducedMotion,
    increaseFontSize,
    decreaseFontSize,
    resetFontSize,
    isHighContrast,
    isReducedMotion,
  };
  
  return (
    <AccessibilityContext.Provider value={accessibilityContextValue}>
      {children}
      {/* Hidden element for screen reader announcements */}
      <div 
        ref={announcerRef}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      />
    </AccessibilityContext.Provider>
  );
}
