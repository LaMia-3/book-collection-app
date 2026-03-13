export type LegacyMigrationEntity =
  | 'settings'
  | 'series'
  | 'books'
  | 'collections'
  | 'upcomingReleases'
  | 'notifications';

export type LegacyMigrationSource =
  | 'book-collection-db'
  | 'bookCollectionDb'
  | 'localStorage';

export interface LegacyImportStatus {
  status: 'not-started' | 'in-progress' | 'completed' | 'failed';
  sourceDatabases: LegacyMigrationSource[];
  entityCounts: Partial<Record<LegacyMigrationEntity, number>>;
  duplicateStrategy: 'prefer-primary-indexeddb-then-fallback-upsert-by-id';
  canonicalImportOrder: LegacyMigrationEntity[];
  lastDetectedAt?: string;
  lastAttemptAt?: string;
  completedAt?: string;
  postMigrationLocalCacheState?: 'retained' | 'stale' | 'cleared';
  lastError?: string;
}

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
  migration?: {
    legacyImport?: LegacyImportStatus;
  };
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
  migration: {},
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
    migration: {
      ...(baseSettings.migration || {}),
      ...(incomingSettings.migration || {}),
      legacyImport: {
        ...(baseSettings.migration?.legacyImport || {}),
        ...(incomingSettings.migration?.legacyImport || {}),
        entityCounts: {
          ...(baseSettings.migration?.legacyImport?.entityCounts || {}),
          ...(incomingSettings.migration?.legacyImport?.entityCounts || {}),
        },
        sourceDatabases: incomingSettings.migration?.legacyImport?.sourceDatabases ||
          baseSettings.migration?.legacyImport?.sourceDatabases,
        canonicalImportOrder: incomingSettings.migration?.legacyImport?.canonicalImportOrder ||
          baseSettings.migration?.legacyImport?.canonicalImportOrder,
      },
    },
  };
};
