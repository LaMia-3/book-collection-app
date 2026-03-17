import { openDB } from 'idb';

import type {
  LegacyImportStatus,
  LegacyMigrationEntity,
  LegacyMigrationSource,
  UserSettings,
} from '@/types/user-settings';
import { DB_CONFIG, StoreNames } from '@/types/indexeddb';

type LegacyDatabaseInventory = {
  name: LegacyMigrationSource;
  version?: number;
  stores: Partial<Record<LegacyMigrationEntity, number>>;
};

type LocalStorageInventory = {
  stores: Partial<Record<LegacyMigrationEntity, number>>;
  keys: string[];
};

export type LegacyLibraryInventory = {
  hasLegacyData: boolean;
  indexedDb: LegacyDatabaseInventory[];
  localStorage: LocalStorageInventory;
  totalCounts: Partial<Record<LegacyMigrationEntity, number>>;
};

export type LegacyLibrarySnapshot = LegacyLibraryInventory & {
  collectedAt: string;
  canonicalImportOrder: LegacyMigrationEntity[];
  duplicateStrategy: LegacyImportStatus['duplicateStrategy'];
  sourceDatabases: LegacyMigrationSource[];
  settings: Record<string, unknown> | null;
  books: Record<string, unknown>[];
  series: Record<string, unknown>[];
  collections: Record<string, unknown>[];
  upcomingReleases: Record<string, unknown>[];
  notifications: Record<string, unknown>[];
};

type DatabaseStoreMap = Record<string, LegacyMigrationEntity>;

const DATABASE_STORE_MAPS: Record<LegacyMigrationSource, DatabaseStoreMap> = {
  'book-collection-db': {
    [StoreNames.SETTINGS]: 'settings',
    [StoreNames.SERIES]: 'series',
    [StoreNames.BOOKS]: 'books',
    [StoreNames.COLLECTIONS]: 'collections',
    [StoreNames.UPCOMING_BOOKS]: 'upcomingReleases',
    [StoreNames.NOTIFICATIONS]: 'notifications',
  },
  bookCollectionDb: {
    settings: 'settings',
    series: 'series',
    books: 'books',
    upcomingReleases: 'upcomingReleases',
    notifications: 'notifications',
  },
  localStorage: {},
};

const LOCAL_STORAGE_KEY_MAP: Record<string, LegacyMigrationEntity> = {
  mira_settings: 'settings',
  seriesLibrary: 'series',
  bookLibrary: 'books',
  collections: 'collections',
  upcomingBooks: 'upcomingReleases',
  releaseNotifications: 'notifications',
};

export const LEGACY_IMPORT_ORDER: LegacyMigrationEntity[] = [
  'settings',
  'series',
  'books',
  'collections',
  'upcomingReleases',
  'notifications',
];

export const LEGACY_DUPLICATE_STRATEGY: LegacyImportStatus['duplicateStrategy'] =
  'prefer-primary-indexeddb-then-fallback-upsert-by-id';

const getIndexedDbCatalog = async (): Promise<Array<{ name?: string; version?: number }>> => {
  const databaseFactory = indexedDB as IDBFactory & {
    databases?: () => Promise<Array<{ name?: string; version?: number }>>;
  };

  if (typeof databaseFactory.databases !== 'function') {
    return [];
  }

  try {
    return (await databaseFactory.databases()) || [];
  } catch {
    return [];
  }
};

const uniqueById = (
  records: Record<string, unknown>[],
): Record<string, unknown>[] => {
  const seenIds = new Set<string>();
  const deduped: Record<string, unknown>[] = [];

  records.forEach((record) => {
    const id = typeof record.id === 'string' ? record.id : undefined;

    if (!id) {
      deduped.push(record);
      return;
    }

    if (seenIds.has(id)) {
      return;
    }

    seenIds.add(id);
    deduped.push(record);
  });

  return deduped;
};

const readExistingDatabase = async (
  dbName: LegacyMigrationSource,
  version: number,
): Promise<LegacyDatabaseInventory & {
  records: Partial<Record<LegacyMigrationEntity, Record<string, unknown>[]>>;
}> => {
  const db = await openDB(dbName, version);
  const stores = DATABASE_STORE_MAPS[dbName];
  const counts: Partial<Record<LegacyMigrationEntity, number>> = {};
  const records: Partial<Record<LegacyMigrationEntity, Record<string, unknown>[]>> = {};

  try {
    for (const [storeName, entity] of Object.entries(stores)) {
      if (!db.objectStoreNames.contains(storeName)) {
        continue;
      }

      const storeRecords = (await db.getAll(storeName)) as Record<string, unknown>[];
      counts[entity] = storeRecords.length;
      records[entity] = storeRecords;
    }
  } finally {
    db.close();
  }

  return {
    name: dbName,
    version,
    stores: counts,
    records,
  };
};

const readLocalStorageInventory = (): LocalStorageInventory & {
  records: Partial<Record<LegacyMigrationEntity, Record<string, unknown>[] | Record<string, unknown>>>;
} => {
  const stores: Partial<Record<LegacyMigrationEntity, number>> = {};
  const records: Partial<Record<LegacyMigrationEntity, Record<string, unknown>[] | Record<string, unknown>>> = {};
  const keys: string[] = [];

  Object.entries(LOCAL_STORAGE_KEY_MAP).forEach(([storageKey, entity]) => {
    const rawValue = localStorage.getItem(storageKey);

    if (!rawValue) {
      return;
    }

    try {
      const parsedValue = JSON.parse(rawValue) as unknown;

      if (Array.isArray(parsedValue)) {
        stores[entity] = parsedValue.length;
        records[entity] = parsedValue as Record<string, unknown>[];
      } else if (parsedValue && typeof parsedValue === 'object') {
        stores[entity] = entity === 'settings' ? 1 : 0;
        records[entity] = parsedValue as Record<string, unknown>;
      } else {
        stores[entity] = 0;
      }

      keys.push(storageKey);
    } catch {
      keys.push(storageKey);
    }
  });

  return {
    stores,
    keys,
    records,
  };
};

const mergeEntityRecords = (
  inventories: Array<Partial<Record<LegacyMigrationEntity, Record<string, unknown>[]>>>,
  localStorageRecords: Partial<Record<LegacyMigrationEntity, Record<string, unknown>[] | Record<string, unknown>>>,
): Pick<
  LegacyLibrarySnapshot,
  'books' | 'series' | 'collections' | 'upcomingReleases' | 'notifications'
> & { settings: Record<string, unknown> | null } => {
  const merged = {
    settings: null as Record<string, unknown> | null,
    books: [] as Record<string, unknown>[],
    series: [] as Record<string, unknown>[],
    collections: [] as Record<string, unknown>[],
    upcomingReleases: [] as Record<string, unknown>[],
    notifications: [] as Record<string, unknown>[],
  };

  const orderedSources = [
    ...inventories,
    localStorageRecords as Partial<Record<LegacyMigrationEntity, Record<string, unknown>[]>>,
  ];

  orderedSources.forEach((source) => {
    const sourceSettings = source.settings;
    const normalizedSettings = Array.isArray(sourceSettings)
      ? sourceSettings[0]
      : (sourceSettings as Record<string, unknown> | undefined);

    if (!merged.settings && normalizedSettings) {
      merged.settings = normalizedSettings;
    }

    merged.books.push(...(source.books || []));
    merged.series.push(...(source.series || []));
    merged.collections.push(...(source.collections || []));
    merged.upcomingReleases.push(...(source.upcomingReleases || []));
    merged.notifications.push(...(source.notifications || []));
  });

  merged.books = uniqueById(merged.books);
  merged.series = uniqueById(merged.series);
  merged.collections = uniqueById(merged.collections);
  merged.upcomingReleases = uniqueById(merged.upcomingReleases);
  merged.notifications = uniqueById(merged.notifications);

  return merged;
};

const sumEntityCounts = (
  indexedDbInventories: LegacyDatabaseInventory[],
  localStorageInventory: LocalStorageInventory,
): Partial<Record<LegacyMigrationEntity, number>> => {
  const totals: Partial<Record<LegacyMigrationEntity, number>> = {};

  indexedDbInventories.forEach((inventory) => {
    Object.entries(inventory.stores).forEach(([entity, count]) => {
      const typedEntity = entity as LegacyMigrationEntity;
      totals[typedEntity] = Math.max(totals[typedEntity] || 0, count || 0);
    });
  });

  Object.entries(localStorageInventory.stores).forEach(([entity, count]) => {
    const typedEntity = entity as LegacyMigrationEntity;
    totals[typedEntity] = Math.max(totals[typedEntity] || 0, count || 0);
  });

  return totals;
};

export const getLegacyLibraryInventory = async (): Promise<LegacyLibraryInventory> => {
  const catalog = await getIndexedDbCatalog();
  const indexedDbInventories: LegacyDatabaseInventory[] = [];
  const indexedDbRecords: Array<Partial<Record<LegacyMigrationEntity, Record<string, unknown>[]>>> = [];

  for (const dbName of ['book-collection-db', 'bookCollectionDb'] as const) {
    const databaseInfo = catalog.find((entry) => entry.name === dbName);

    if (!databaseInfo?.version) {
      continue;
    }

    const inventory = await readExistingDatabase(dbName, databaseInfo.version);
    indexedDbInventories.push({
      name: inventory.name,
      version: inventory.version,
      stores: inventory.stores,
    });
    indexedDbRecords.push(inventory.records);
  }

  const localStorageInventory = readLocalStorageInventory();
  const totalCounts = sumEntityCounts(indexedDbInventories, localStorageInventory);
  const hasLegacyData = Object.values(totalCounts).some((count) => (count || 0) > 0);

  return {
    hasLegacyData,
    indexedDb: indexedDbInventories,
    localStorage: {
      stores: localStorageInventory.stores,
      keys: localStorageInventory.keys,
    },
    totalCounts,
  };
};

export const collectLegacyLibrarySnapshot = async (): Promise<LegacyLibrarySnapshot> => {
  const catalog = await getIndexedDbCatalog();
  const indexedDbInventories: LegacyDatabaseInventory[] = [];
  const indexedDbRecords: Array<Partial<Record<LegacyMigrationEntity, Record<string, unknown>[]>>> = [];

  for (const dbName of ['book-collection-db', 'bookCollectionDb'] as const) {
    const databaseInfo = catalog.find((entry) => entry.name === dbName);

    if (!databaseInfo?.version) {
      continue;
    }

    const inventory = await readExistingDatabase(dbName, databaseInfo.version);
    indexedDbInventories.push({
      name: inventory.name,
      version: inventory.version,
      stores: inventory.stores,
    });
    indexedDbRecords.push(inventory.records);
  }

  const localStorageInventory = readLocalStorageInventory();
  const normalizedRecords = mergeEntityRecords(indexedDbRecords, localStorageInventory.records);
  const totalCounts = sumEntityCounts(indexedDbInventories, localStorageInventory);
  const sourceDatabases = [
    ...indexedDbInventories.map((inventory) => inventory.name),
    ...(localStorageInventory.keys.length > 0 ? (['localStorage'] as const) : []),
  ] as LegacyMigrationSource[];

  return {
    collectedAt: new Date().toISOString(),
    hasLegacyData: Object.values(totalCounts).some((count) => (count || 0) > 0),
    indexedDb: indexedDbInventories,
    localStorage: {
      stores: localStorageInventory.stores,
      keys: localStorageInventory.keys,
    },
    totalCounts,
    canonicalImportOrder: LEGACY_IMPORT_ORDER,
    duplicateStrategy: LEGACY_DUPLICATE_STRATEGY,
    sourceDatabases,
    settings: normalizedRecords.settings,
    books: normalizedRecords.books,
    series: normalizedRecords.series,
    collections: normalizedRecords.collections,
    upcomingReleases: normalizedRecords.upcomingReleases,
    notifications: normalizedRecords.notifications,
  };
};

export const hasLegacyLibraryDataForCurrentBrowser = async (): Promise<boolean> => {
  const inventory = await getLegacyLibraryInventory();
  return inventory.hasLegacyData;
};

export const hasCompletedLegacyImport = (settings?: UserSettings | null): boolean => {
  return settings?.migration?.legacyImport?.status === 'completed';
};

export const buildLegacyImportStatus = (
  snapshot: LegacyLibrarySnapshot,
  overrides: Partial<LegacyImportStatus> = {},
): LegacyImportStatus => ({
  status: 'not-started',
  sourceDatabases: snapshot.sourceDatabases,
  entityCounts: snapshot.totalCounts,
  duplicateStrategy: LEGACY_DUPLICATE_STRATEGY,
  canonicalImportOrder: LEGACY_IMPORT_ORDER,
  lastDetectedAt: snapshot.collectedAt,
  postMigrationLocalCacheState: 'retained',
  ...overrides,
});

export const PRIMARY_LEGACY_DATABASE_NAME = DB_CONFIG.NAME;
