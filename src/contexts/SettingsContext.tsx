import React, { createContext, useContext, useEffect, useState } from 'react';
import { userSettingsRepository } from '@/repositories/UserSettingsRepository';
import { UserSettings, defaultSettings, mergeUserSettings } from '@/types/user-settings';

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
        const storedSettings = await userSettingsRepository.get();
        setSettings(mergeUserSettings(defaultSettings, storedSettings));
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
      const updatedSettings = mergeUserSettings(settings, newSettings);
      const persistedSettings = await userSettingsRepository.update(updatedSettings);
      setSettings(persistedSettings);
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
