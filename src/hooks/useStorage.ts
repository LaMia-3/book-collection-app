import { useState, useCallback } from 'react';
import storageService from '@/services/storage/StorageService';

/**
 * Hook for using the storage service with React components
 * Provides simplified methods for getting and setting data in storage
 */
export const useStorage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Get an item from storage
  const getItem = useCallback(async (key: string): Promise<any> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Get settings where most key/value pairs are stored
      const settings = await storageService.getSettings();
      if (settings) {
        // Cast to Record<string, any> to allow string indexing
        const settingsObj = settings as Record<string, any>;
        return settingsObj[key] !== undefined ? settingsObj[key] : null;
      }
      return null;
    } catch (err) {
      console.error('Error getting item from storage:', err);
      setError(err instanceof Error ? err : new Error('Failed to get item from storage'));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Set an item in storage
  const setItem = useCallback(async (key: string, value: any): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Get current settings
      const settings = await storageService.getSettings() || {};
      
      // Update with new value using type assertion for index signature
      const updatedSettings = {
        ...settings,
        [key]: value
      } as Record<string, any>;
      
      // Save back to storage
      await storageService.saveSettings(updatedSettings);
    } catch (err) {
      console.error('Error setting item in storage:', err);
      setError(err instanceof Error ? err : new Error('Failed to set item in storage'));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Remove an item from storage
  const removeItem = useCallback(async (key: string): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Get current settings
      const settings = await storageService.getSettings() || {};
      
      // Remove the key
      if (settings && (settings as Record<string, any>)[key] !== undefined) {
        // Cast to Record<string, any> to allow indexing with string
        const settingsObj = settings as Record<string, any>;
        const { [key]: removed, ...updatedSettings } = settingsObj;
        
        // Save back to storage
        await storageService.saveSettings(updatedSettings);
      }
    } catch (err) {
      console.error('Error removing item from storage:', err);
      setError(err instanceof Error ? err : new Error('Failed to remove item from storage'));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    getItem,
    setItem,
    removeItem,
    isLoading,
    error
  };
};

export default useStorage;
