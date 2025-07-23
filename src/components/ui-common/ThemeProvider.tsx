import React, { createContext, useContext, useEffect, useState } from 'react';
import { ThemeProvider as NextThemeProvider } from 'next-themes';

// Theme configuration types
export type ColorMode = 'light' | 'dark' | 'system';
export type AccessibilityMode = 'default' | 'high-contrast' | 'reduced-motion';

interface ThemeContextType {
  colorMode: ColorMode;
  setColorMode: (mode: ColorMode) => void;
  accessibilityMode: AccessibilityMode;
  setAccessibilityMode: (mode: AccessibilityMode) => void;
  fontScale: number;
  setFontScale: (scale: number) => void;
  effectiveColorMode: 'light' | 'dark';
  spineColorPalette: 'default' | 'custom';
  setSpineColorPalette: (palette: 'default' | 'custom') => void;
}

const ThemeContext = createContext<ThemeContextType>({
  colorMode: 'system',
  setColorMode: () => {},
  accessibilityMode: 'default',
  setAccessibilityMode: () => {},
  fontScale: 1,
  setFontScale: () => {},
  effectiveColorMode: 'light',
  spineColorPalette: 'default',
  setSpineColorPalette: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  // State for theme settings
  const [colorMode, setColorMode] = useState<ColorMode>('system');
  const [accessibilityMode, setAccessibilityMode] = useState<AccessibilityMode>('default');
  const [fontScale, setFontScale] = useState<number>(1);
  const [effectiveColorMode, setEffectiveColorMode] = useState<'light' | 'dark'>('light');
  const [spineColorPalette, setSpineColorPalette] = useState<'default' | 'custom'>('default');
  
  // Load saved theme settings from localStorage on component mount
  useEffect(() => {
    const savedColorMode = localStorage.getItem('colorMode') as ColorMode;
    const savedAccessibilityMode = localStorage.getItem('accessibilityMode') as AccessibilityMode;
    const savedFontScale = localStorage.getItem('fontScale');
    const savedSpineColorPalette = localStorage.getItem('spineColorPalette') as 'default' | 'custom';

    if (savedColorMode) setColorMode(savedColorMode);
    if (savedAccessibilityMode) setAccessibilityMode(savedAccessibilityMode);
    if (savedFontScale) setFontScale(Number(savedFontScale));
    if (savedSpineColorPalette) setSpineColorPalette(savedSpineColorPalette);
    
    // Add event listener for system color scheme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (colorMode === 'system') {
        setEffectiveColorMode(mediaQuery.matches ? 'dark' : 'light');
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Save theme settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem('colorMode', colorMode);
    localStorage.setItem('accessibilityMode', accessibilityMode);
    localStorage.setItem('fontScale', fontScale.toString());
    localStorage.setItem('spineColorPalette', spineColorPalette);
  }, [colorMode, accessibilityMode, fontScale, spineColorPalette]);
  
  // Apply accessibility classes to document element
  useEffect(() => {
    const html = document.documentElement;
    
    // Apply high contrast mode
    if (accessibilityMode === 'high-contrast') {
      html.classList.add('high-contrast');
    } else {
      html.classList.remove('high-contrast');
    }
    
    // Apply reduced motion mode
    if (accessibilityMode === 'reduced-motion') {
      html.classList.add('reduced-motion');
    } else {
      html.classList.remove('reduced-motion');
    }
    
    // Apply font scaling
    html.style.fontSize = `${fontScale * 100}%`;
    
  }, [accessibilityMode, fontScale]);
  
  // Update effective color mode when colorMode changes
  useEffect(() => {
    if (colorMode === 'system') {
      const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setEffectiveColorMode(isDarkMode ? 'dark' : 'light');
    } else {
      setEffectiveColorMode(colorMode);
    }
  }, [colorMode]);

  const themeContextValue: ThemeContextType = {
    colorMode,
    setColorMode,
    accessibilityMode,
    setAccessibilityMode,
    fontScale,
    setFontScale,
    effectiveColorMode,
    spineColorPalette,
    setSpineColorPalette,
  };

  return (
    <ThemeContext.Provider value={themeContextValue}>
      <NextThemeProvider 
        attribute="class" 
        defaultTheme={colorMode} 
        enableSystem={colorMode === 'system'}
      >
        {children}
      </NextThemeProvider>
    </ThemeContext.Provider>
  );
}
