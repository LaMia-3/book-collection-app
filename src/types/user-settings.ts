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
  displayOptions?: {
    groupSpecialStatuses: boolean;
    disableHoverEffect: boolean;
    shelfOrder: string[];
  };
  notifications?: Record<string, boolean>;
}

export const defaultSettings: UserSettings = {
  preferredName: '',
  birthday: '',
  celebrateBirthday: true,
  defaultView: 'shelf',
  defaultApi: 'google',
  defaultStatus: 'want-to-read',
  goals: {
    enabled: false,
    monthlyTarget: 4,
  },
  displayOptions: {
    groupSpecialStatuses: false,
    disableHoverEffect: false,
    shelfOrder: ['reading', 'want-to-read', 'completed', 'on-hold', 'dnf'],
  },
  notifications: {},
};

export const mergeUserSettings = (
  baseSettings: UserSettings,
  incomingSettings?: UserSettings | null,
): UserSettings => {
  if (!incomingSettings) {
    return baseSettings;
  }

  return {
    ...baseSettings,
    ...incomingSettings,
    goals: {
      ...baseSettings.goals,
      ...incomingSettings.goals,
    },
    displayOptions: {
      ...baseSettings.displayOptions,
      ...incomingSettings.displayOptions,
    },
    notifications: {
      ...(baseSettings.notifications || {}),
      ...(incomingSettings.notifications || {}),
    },
  };
};
