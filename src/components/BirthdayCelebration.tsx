import React, { useEffect, useState } from 'react';
import { useSettings } from '@/contexts/SettingsContext';
import { Cake, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import { createLogger } from '@/utils/loggingUtils';

const log = createLogger('BirthdayCelebration');

const getTodayFormatted = () => {
  const now = new Date();
  const formattedDate = `${now.getMonth() + 1}/${now.getDate()}`;
  log.debug(`Today's formatted date: ${formattedDate} (from date object: ${now.toISOString()})`);
  return formattedDate;
};

const getBirthdayMonthDay = (birthdayString: string) => {
  try {
    log.debug(`Processing birthday string: ${birthdayString}`);
    
    if (birthdayString.includes('/')) {
      log.debug('Detected MM/DD/YYYY format with slashes');
      const parts = birthdayString.split('/');
      
      if (parts.length === 3) {
        const month = parseInt(parts[0], 10);
        const day = parseInt(parts[1], 10);
        
        if (!isNaN(month) && !isNaN(day) && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          const formattedBirthday = `${month}/${day}`;
          log.debug(`Parsed MM/DD/YYYY format as: ${formattedBirthday}`);
          return formattedBirthday;
        } else {
          log.warn(`Invalid MM/DD/YYYY format: ${birthdayString}`);
        }
      }
    }
    
    if (birthdayString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      log.debug('Detected YYYY-MM-DD format');
      const parts = birthdayString.split('-');
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      
      if (!isNaN(year) && !isNaN(month) && !isNaN(day) && 
          month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        const formattedBirthday = `${month}/${day}`;
        log.debug(`Parsed YYYY-MM-DD format as: ${formattedBirthday}`);
        return formattedBirthday;
      }
    }
    
    const dateStr = birthdayString.includes('T') ? birthdayString : `${birthdayString}T12:00:00`;
    const date = new Date(dateStr);
    
    if (isNaN(date.getTime())) {
      log.warn(`Invalid birthday date string: ${birthdayString}`);
      return null;
    }
    
    const formattedBirthday = `${date.getMonth() + 1}/${date.getDate()}`;
    log.debug(`Parsed birthday as: ${formattedBirthday}`);
    return formattedBirthday;
  } catch (e) {
    log.error(`Error parsing birthday date: ${birthdayString}`, e);
    return null;
  }
};

export const BirthdayCelebration: React.FC = () => {
  const { settings, updateSettings } = useSettings();
  const [showCelebration, setShowCelebration] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  
  // Store dismissed status in IndexedDB with the current date to track it persistently
  // The key includes the date so it will reset each day
  const today = new Date().toISOString().split('T')[0];
  const dismissStorageKey = `birthday-celebration-dismissed-${today}`;
  
  // Check for dismissed status from the current settings source.
  useEffect(() => {
    const notificationSettings = settings.notifications || {};

    log.debug(`Checking dismissed status for key: ${dismissStorageKey}`);

    if (notificationSettings[dismissStorageKey] === true) {
      log.info('Birthday celebration already dismissed today');
      setDismissed(true);
      return;
    }

    setDismissed(false);
    log.debug('Birthday celebration not yet dismissed today');
  }, [dismissStorageKey, settings.notifications]);
  
  // Check if today is the user's birthday
  useEffect(() => {
    // Only show celebration if:
    // 1. User has a birthday set
    // 2. User has chosen to celebrate birthdays
    // 3. Today is their birthday
    // 4. The celebration hasn't been dismissed
    if (dismissed) {
      // Ensure the celebration is hidden when dismissed
      log.debug('Birthday celebration is dismissed, not showing');
      setShowCelebration(false);
      return;
    }
    
    log.debug('Checking birthday settings', { 
      hasBirthday: !!settings.birthday, 
      celebrateBirthday: !!settings.celebrateBirthday,
      birthdayValue: settings.birthday
    });
    
    if (settings.birthday && settings.celebrateBirthday) {
      const todayFormatted = getTodayFormatted();
      const birthdayFormatted = getBirthdayMonthDay(settings.birthday);
      
      log.info('Comparing dates', { 
        today: todayFormatted, 
        birthday: birthdayFormatted,
        isMatch: birthdayFormatted && todayFormatted === birthdayFormatted
      });
      
      if (birthdayFormatted && todayFormatted === birthdayFormatted) {
        log.info(`🎉 It's the user's birthday today! Showing celebration`);
        setShowCelebration(true);
        
        // Fire confetti when it's the user's birthday
        log.debug('Triggering confetti celebration');
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
              const notificationSettings = settings.notifications || {};

              await updateSettings({
                notifications: {
                  ...notificationSettings,
                  [dismissStorageKey]: true
                }
              });
              log.info('Birthday celebration dismissed status saved successfully');
            } catch (error) {
              log.error('Error saving birthday celebration dismissed status:', error);
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
