import React, { useEffect, useState } from 'react';
import { useSettings } from '@/contexts/SettingsContext';
import { Cake, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import { enhancedStorageService } from '@/services/storage/EnhancedStorageService';

export const BirthdayCelebration: React.FC = () => {
  const { settings } = useSettings();
  const [showCelebration, setShowCelebration] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  
  // Store dismissed status in localStorage with the current date to track it persistently
  // The key includes the date so it will reset each day
  const today = new Date().toISOString().split('T')[0];
  const dismissStorageKey = `birthday-celebration-dismissed-${today}`;
  
  // Get today's date in MM/DD format for comparison
  const getTodayFormatted = () => {
    const now = new Date();
    // Return month and day as numbers
    return `${now.getMonth() + 1}/${now.getDate()}`;
  };
  
  // Extract month and day from birthday
  const getBirthdayMonthDay = (birthdayString: string) => {
    try {
      // Create a date object with the birthday string
      // Note: When parsing dates with new Date(), the date is interpreted in the local timezone
      const date = new Date(birthdayString);
      
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        return null;
      }
      
      // Return month and day as numbers to match the todayFormatted format
      return `${date.getMonth() + 1}/${date.getDate()}`;
    } catch (e) {
      console.error('Error parsing birthday date:', e);
      return null;
    }
  };
  
  // Check for dismissed status on load from IndexedDB, with localStorage fallback
  useEffect(() => {
    const checkDismissed = async () => {
      try {
        // Initialize storage service
        await enhancedStorageService.initialize();
        
        // Try to get from IndexedDB first
        const settings = await enhancedStorageService.getSettings();
        const notificationSettings = settings?.notifications || {};
        
        if (notificationSettings[dismissStorageKey] === true) {
          setDismissed(true);
          return;
        }
        
        // Fallback to localStorage for backward compatibility
        const storedDismissed = localStorage.getItem(dismissStorageKey);
        if (storedDismissed === 'true') {
          setDismissed(true);
          
          // Migrate setting to IndexedDB
          await enhancedStorageService.saveSettings({
            ...settings,
            notifications: {
              ...notificationSettings,
              [dismissStorageKey]: true
            }
          });
        }
      } catch (error) {
        console.error('Error checking birthday celebration dismissed status:', error);
        // Silent fallback to localStorage
        const storedDismissed = localStorage.getItem(dismissStorageKey);
        if (storedDismissed === 'true') {
          setDismissed(true);
        }
      }
    };
    checkDismissed();
  }, [dismissStorageKey]);
  
  // Check if today is the user's birthday
  useEffect(() => {
    // Only show celebration if:
    // 1. User has a birthday set
    // 2. User has chosen to celebrate birthdays
    // 3. Today is their birthday
    // 4. The celebration hasn't been dismissed
    if (dismissed) {
      // Ensure the celebration is hidden when dismissed
      setShowCelebration(false);
      return;
    }
    
    if (settings.birthday && settings.celebrateBirthday) {
      const todayFormatted = getTodayFormatted();
      const birthdayFormatted = getBirthdayMonthDay(settings.birthday);
      
      if (birthdayFormatted && todayFormatted === birthdayFormatted) {
        setShowCelebration(true);
        
        // Fire confetti when it's the user's birthday
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    }
  }, [settings.birthday, settings.celebrateBirthday, dismissed]);
  
  // Don't render anything if not showing celebration
  if (!showCelebration) {
    return null;
  }
  
  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-pink-500 to-purple-500 text-white px-6 py-4 rounded-lg shadow-lg z-50 animate-bounce-slow">
      <div className="flex items-center gap-3">
        <Cake className="h-6 w-6 text-white" />
        <div>
          <h3 className="font-semibold text-lg">Happy Birthday{settings.preferredName ? `, ${settings.preferredName}` : ''}!</h3>
          <p className="text-sm">Enjoy your special day with your favorite books!</p>
        </div>
        <button 
          onClick={async () => {
            try {
              // Store the dismissed state in IndexedDB
              const settings = await enhancedStorageService.getSettings() || {};
              const notificationSettings = settings.notifications || {};
              
              await enhancedStorageService.saveSettings({
                ...settings,
                notifications: {
                  ...notificationSettings,
                  [dismissStorageKey]: true
                }
              });
              
              // Keep localStorage for backwards compatibility
              localStorage.setItem(dismissStorageKey, 'true');
            } catch (error) {
              console.error('Error saving birthday celebration dismissed status:', error);
              // Fallback to localStorage
              localStorage.setItem(dismissStorageKey, 'true');
            }
            
            setDismissed(true);
            setShowCelebration(false);
          }}
          className="ml-4 p-1 rounded-full hover:bg-white/20 transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export default BirthdayCelebration;
