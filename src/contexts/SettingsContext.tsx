import React, { createContext, useContext, useEffect, useState } from 'react';
import storageService from '@/services/storage/StorageService';

// Define the settings types
export interface UserSettings {
  preferredName?: string;
  birthday?: string;
  celebrateBirthday?: boolean;
  defaultView?: 'shelf' | 'list' | 'cover' | 'insights';
  defaultApi?: 'google' | 'openlibrary';
  defaultStatus?: 'want-to-read' | 'reading' | 'completed';
  goals?: {
    enabled: boolean;
    monthlyTarget: number;
  };
}

// Default settings values
export const defaultSettings: UserSettings = {
  preferredName: '',
  birthday: '',
  celebrateBirthday: true,
  defaultView: 'shelf',
  defaultApi: 'google',
  defaultStatus: 'want-to-read',
  goals: {
    enabled: false,
    monthlyTarget: 4, // Default to 4 books per month
  },
};

// Context interface
interface SettingsContextType {
  settings: UserSettings;
  updateSettings: (newSettings: Partial<UserSettings>) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

// Create the context
export const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  updateSettings: async () => {},
  isLoading: true,
  error: null,
});

// Provider component
export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Load settings from storage when component mounts
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        const storedSettings = await storageService.getSettings();
        
        if (storedSettings) {
          // Merge stored settings with defaults to ensure all fields exist
          setSettings({ ...defaultSettings, ...storedSettings });
        }
        setError(null);
      } catch (err) {
        console.error('Failed to load settings:', err);
        setError('Failed to load settings');
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Update settings in storage and state
  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    try {
      const updatedSettings = { ...settings, ...newSettings };
      await storageService.saveSettings(updatedSettings);
      setSettings(updatedSettings);
      setError(null);
    } catch (err) {
      console.error('Failed to save settings:', err);
      setError('Failed to save settings');
      throw err;
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, isLoading, error }}>
      {children}
    </SettingsContext.Provider>
  );
};

// Custom hook for using the settings context
export const useSettings = () => useContext(SettingsContext);

export default SettingsProvider;
