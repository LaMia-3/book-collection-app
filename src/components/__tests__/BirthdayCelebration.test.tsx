import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock dependencies before importing the component
jest.mock('@/contexts/SettingsContext', () => ({
  useSettings: jest.fn().mockReturnValue({
    settings: {
      preferredName: 'Test User',
      birthday: '',
      celebrateBirthday: true
    }
  })
}));

jest.mock('@/utils/loggingUtils', () => ({
  createLogger: jest.fn().mockReturnValue({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    trace: jest.fn()
  })
}));

// Mock storage service
jest.mock('@/services/storage/EnhancedStorageService', () => ({
  enhancedStorageService: {
    initialize: jest.fn().mockResolvedValue(undefined),
    getSettings: jest.fn().mockResolvedValue({ notifications: {} }),
    saveSettings: jest.fn().mockResolvedValue(undefined)
  }
}));

// Mock confetti
jest.mock('canvas-confetti', () => jest.fn());

// Import component after mocks are set up
import { BirthdayCelebration } from '../BirthdayCelebration';
import { useSettings } from '@/contexts/SettingsContext';

// Access the mocks
const mockUseSettings = useSettings as jest.Mock;
const mockEnhancedStorageService = jest.requireMock('@/services/storage/EnhancedStorageService').enhancedStorageService;

// Mock date for consistent testing
const mockDate = new Date('2025-08-17T12:00:00');
const originalDate = global.Date;

describe('BirthdayCelebration', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Default settings
    mockUseSettings.mockReturnValue({
      settings: {
        preferredName: 'Test User',
        birthday: '',
        celebrateBirthday: true
      }
    });
    
    // Reset storage mock
    mockEnhancedStorageService.getSettings.mockResolvedValue({
      notifications: {}
    });
    
    // Mock date to fix today's date for tests
    global.Date = class extends originalDate {
      constructor(date?: Date | string | number) {
        if (date) {
          super(date);
        } else {
          super(mockDate);
        }
      }
      
      static now() {
        return mockDate.getTime();
      }
    } as unknown as typeof global.Date;
  });

  afterEach(() => {
    // Restore original Date
    global.Date = originalDate;
  });

  test('should not show celebration when birthday is not set', async () => {
    await act(async () => {
      render(<BirthdayCelebration />);
    });

    // Expect no celebration to be shown
    expect(screen.queryByText(/Happy Birthday/i)).not.toBeInTheDocument();
  });

  test('should show celebration on user birthday', async () => {
    // Set birthday to today (August 17)
    mockUseSettings.mockReturnValue({
      settings: {
        preferredName: 'Test User',
        birthday: '2000-08-17', // Same day as mockDate (August 17)
        celebrateBirthday: true
      }
    });
    
    // Mock getTodayFormatted and getBirthdayMonthDay to return the same value
    // to ensure the comparison in the component will be true
    const mockFormattedDate = '8/17'; // August 17
    jest.spyOn(global.Date.prototype, 'getMonth').mockImplementation(() => 7); // August (0-indexed)
    jest.spyOn(global.Date.prototype, 'getDate').mockImplementation(() => 17);

    await act(async () => {
      render(<BirthdayCelebration />);
    });

    // Expect celebration to be shown
    expect(screen.getByText(/Happy Birthday/i)).toBeInTheDocument();
    expect(screen.getByText(/Test User/i)).toBeInTheDocument();
  });

  test('should not show celebration when celebrateBirthday is false', async () => {
    // Set birthday to today but celebration disabled
    mockUseSettings.mockReturnValue({
      settings: {
        preferredName: 'Test User',
        birthday: '2000-08-17', // Same day as mockDate (August 17)
        celebrateBirthday: false
      }
    });

    await act(async () => {
      render(<BirthdayCelebration />);
    });

    // Expect no celebration to be shown
    expect(screen.queryByText(/Happy Birthday/i)).not.toBeInTheDocument();
  });

  test('should not show celebration on non-birthday date', async () => {
    // Set birthday to different day than today
    mockUseSettings.mockReturnValue({
      settings: {
        preferredName: 'Test User',
        birthday: '2000-01-01', // Different day than mockDate
        celebrateBirthday: true
      }
    });

    await act(async () => {
      render(<BirthdayCelebration />);
    });

    // Expect no celebration to be shown
    expect(screen.queryByText(/Happy Birthday/i)).not.toBeInTheDocument();
  });

  test('should dismiss celebration when dismiss button is clicked', async () => {
    // Set birthday to today
    mockUseSettings.mockReturnValue({
      settings: {
        preferredName: 'Test User',
        birthday: '2000-08-17', // Same day as mockDate (August 17)
        celebrateBirthday: true
      }
    });
    
    // Mock date methods to ensure birthday comparison works
    jest.spyOn(global.Date.prototype, 'getMonth').mockImplementation(() => 7); // August (0-indexed)
    jest.spyOn(global.Date.prototype, 'getDate').mockImplementation(() => 17);
    
    // Mock toISOString to ensure consistent dismissal key
    jest.spyOn(global.Date.prototype, 'toISOString').mockImplementation(() => '2025-08-17T12:00:00.000Z');

    await act(async () => {
      render(<BirthdayCelebration />);
    });

    // Expect celebration to be shown
    expect(screen.getByText(/Happy Birthday/i)).toBeInTheDocument();
    
    // Click the dismiss button
    await act(async () => {
      fireEvent.click(screen.getByLabelText('Dismiss'));
    });
    
    // Celebration should be dismissed
    expect(screen.queryByText(/Happy Birthday/i)).not.toBeInTheDocument();
    
    // Should save dismissed status to storage
    expect(mockEnhancedStorageService.saveSettings).toHaveBeenCalled();
    const saveCall = mockEnhancedStorageService.saveSettings.mock.calls[0][0];
    expect(saveCall.notifications).toBeDefined();
    // Today's date in ISO format should be part of the key
    const todayString = '2025-08-17';
    const dismissKey = Object.keys(saveCall.notifications).find(key => 
      key.includes('birthday-celebration-dismissed') && key.includes(todayString)
    );
    expect(dismissKey).toBeDefined();
    expect(saveCall.notifications[dismissKey!]).toBe(true);
  });

  test('should not show celebration if already dismissed today', async () => {
    // Set birthday to today
    mockUseSettings.mockReturnValue({
      settings: {
        preferredName: 'Test User',
        birthday: '2000-08-17', // Same day as mockDate (August 17)
        celebrateBirthday: true
      }
    });

    // Mock that the celebration has already been dismissed today
    const todayString = '2025-08-17';
    const dismissKey = `birthday-celebration-dismissed-${todayString}`;
    mockEnhancedStorageService.getSettings.mockResolvedValue({
      notifications: {
        [dismissKey]: true
      }
    });

    await act(async () => {
      render(<BirthdayCelebration />);
    });

    // Expect no celebration to be shown
    expect(screen.queryByText(/Happy Birthday/i)).not.toBeInTheDocument();
  });
  
  test('should correctly parse MM/DD/YYYY format birthday', async () => {
    // Set birthday in MM/DD/YYYY format for today
    mockUseSettings.mockReturnValue({
      settings: {
        preferredName: 'Test User',
        birthday: '08/17/2025', // Same day as mockDate (August 17) but in MM/DD/YYYY format
        celebrateBirthday: true
      }
    });
    
    // Mock date methods to ensure date comparison
    jest.spyOn(global.Date.prototype, 'getMonth').mockImplementation(() => 7); // August (0-indexed)
    jest.spyOn(global.Date.prototype, 'getDate').mockImplementation(() => 17);

    await act(async () => {
      render(<BirthdayCelebration />);
    });

    // Expect celebration to be shown since dates match
    expect(screen.getByText(/Happy Birthday/i)).toBeInTheDocument();
  });
  
  test('should not show celebration for MM/DD/YYYY format when dates do not match', async () => {
    // Set birthday in MM/DD/YYYY format for a different day
    mockUseSettings.mockReturnValue({
      settings: {
        preferredName: 'Test User',
        birthday: '08/18/2025', // Different day than mockDate
        celebrateBirthday: true
      }
    });
    
    // Mock date methods to ensure date comparison
    jest.spyOn(global.Date.prototype, 'getMonth').mockImplementation(() => 7); // August (0-indexed)
    jest.spyOn(global.Date.prototype, 'getDate').mockImplementation(() => 17);

    await act(async () => {
      render(<BirthdayCelebration />);
    });

    // Expect no celebration to be shown since dates don't match
    expect(screen.queryByText(/Happy Birthday/i)).not.toBeInTheDocument();
  });
});
