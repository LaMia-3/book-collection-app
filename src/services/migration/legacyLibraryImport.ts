import { getStoredAuthToken } from '@/lib/auth-storage';
import { bookRepository } from '@/repositories/BookRepository';
import { collectionRepository } from '@/repositories/CollectionRepository';
import { notificationRepository } from '@/repositories/NotificationRepository';
import { seriesRepository } from '@/repositories/SeriesRepository';
import { upcomingReleasesRepository } from '@/repositories/UpcomingReleasesRepository';
import { userSettingsRepository } from '@/repositories/UserSettingsRepository';
import type { Book } from '@/types/book';
import type { Collection } from '@/types/collection';
import type { Notification, NotificationType } from '@/types/notification';
import type { Series, UpcomingBook } from '@/types/series';
import {
  defaultSettings,
  mergeUserSettings,
  type LegacyMigrationEntity,
  type UserSettings,
} from '@/types/user-settings';

import {
  LEGACY_IMPORT_ORDER,
  buildLegacyImportStatus,
  collectLegacyLibrarySnapshot,
  hasCompletedLegacyImport,
  type LegacyLibrarySnapshot,
} from './legacyLibraryMigration';

type ImportProgressCallback = (
  progress: number,
  summary: string,
  details?: string,
) => void;

type ImportFailure = {
  entity: LegacyMigrationEntity;
  id?: string;
  reason: string;
};

export type LegacyImportExecutionResult = {
  status: 'completed' | 'failed' | 'skipped';
  importedCounts: Partial<Record<LegacyMigrationEntity, number>>;
  updatedCounts: Partial<Record<LegacyMigrationEntity, number>>;
  failures: ImportFailure[];
  snapshot: LegacyLibrarySnapshot;
};

type ImportOptions = {
  force?: boolean;
  onProgress?: ImportProgressCallback;
  snapshot?: LegacyLibrarySnapshot;
};

const ALLOWED_DEFAULT_VIEWS = new Set(['shelf', 'list', 'cover', 'insights']);
const ALLOWED_DEFAULT_APIS = new Set(['google', 'openlibrary']);
const ALLOWED_DEFAULT_STATUSES = new Set(['want-to-read', 'reading', 'completed']);
const ALLOWED_SERIES_READING_ORDERS = new Set(['publication', 'chronological', 'custom']);
const ALLOWED_SERIES_STATUSES = new Set(['ongoing', 'completed', 'cancelled']);
const ALLOWED_NOTIFICATION_TYPES = new Set<NotificationType>([
  'release',
  'system',
  'update',
  'alert',
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const toStringValue = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized || undefined;
};

const toBooleanValue = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') {
    return value;
  }

  return undefined;
};

const toNumberValue = (value: unknown): number | undefined => {
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);

    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return undefined;
};

const toDateValue = (value: unknown): Date | undefined => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);

    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return undefined;
};

const toStringArray = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return value
    .map((entry) => toStringValue(entry))
    .filter((entry): entry is string => Boolean(entry));
};

const sanitizeLegacySettings = (value: unknown): Partial<UserSettings> => {
  if (!isRecord(value)) {
    return {};
  }

  const goals = isRecord(value.goals)
    ? {
        enabled: toBooleanValue(value.goals.enabled) ?? false,
        monthlyTarget: toNumberValue(value.goals.monthlyTarget) ?? 4,
      }
    : undefined;

  const displayOptions = isRecord(value.displayOptions)
    ? {
        groupSpecialStatuses: toBooleanValue(value.displayOptions.groupSpecialStatuses) ?? false,
        disableHoverEffect: toBooleanValue(value.displayOptions.disableHoverEffect) ?? false,
        shelfOrder:
          toStringArray(value.displayOptions.shelfOrder) ||
          defaultSettings.displayOptions?.shelfOrder ||
          [],
      }
    : undefined;

  const notifications = isRecord(value.notifications)
    ? Object.fromEntries(
        Object.entries(value.notifications)
          .filter(([, notificationValue]) => typeof notificationValue === 'boolean')
          .map(([key, notificationValue]) => [key, notificationValue as boolean]),
      )
    : undefined;

  const defaultView = toStringValue(value.defaultView);
  const defaultApi = toStringValue(value.defaultApi);
  const defaultStatus = toStringValue(value.defaultStatus);

  return {
    preferredName: toStringValue(value.preferredName),
    birthday: toStringValue(value.birthday),
    celebrateBirthday: toBooleanValue(value.celebrateBirthday),
    defaultView:
      defaultView && ALLOWED_DEFAULT_VIEWS.has(defaultView)
        ? (defaultView as UserSettings['defaultView'])
        : undefined,
    defaultApi:
      defaultApi && ALLOWED_DEFAULT_APIS.has(defaultApi)
        ? (defaultApi as UserSettings['defaultApi'])
        : undefined,
    defaultStatus:
      defaultStatus && ALLOWED_DEFAULT_STATUSES.has(defaultStatus)
        ? (defaultStatus as UserSettings['defaultStatus'])
        : undefined,
    goals,
    displayOptions,
    notifications,
  };
};

const sanitizeLegacySeries = (value: unknown): Series | null => {
  if (!isRecord(value)) {
    return null;
  }

  const id = toStringValue(value.id);
  const name = toStringValue(value.name);

  if (!id || !name) {
    return null;
  }

  const readingOrder = toStringValue(value.readingOrder);
  const status = toStringValue(value.status);
  const createdAt =
    toDateValue(value.createdAt) || toDateValue(value.dateAdded) || new Date();
  const updatedAt =
    toDateValue(value.updatedAt) || toDateValue(value.lastModified) || createdAt;

  return {
    id,
    name,
    description: toStringValue(value.description),
    author: toStringValue(value.author),
    coverImage: toStringValue(value.coverImage),
    books: toStringArray(value.books) || [],
    totalBooks: toNumberValue(value.totalBooks),
    readingOrder:
      readingOrder && ALLOWED_SERIES_READING_ORDERS.has(readingOrder)
        ? (readingOrder as Series['readingOrder'])
        : 'publication',
    customOrder: toStringArray(value.customOrder),
    status:
      status && ALLOWED_SERIES_STATUSES.has(status)
        ? (status as NonNullable<Series['status']>)
        : undefined,
    genre: toStringArray(value.genre) || toStringArray(value.categories),
    isTracked: toBooleanValue(value.isTracked) ?? false,
    hasUpcoming: toBooleanValue(value.hasUpcoming),
    apiEnriched: toBooleanValue(value.apiEnriched),
    createdAt,
    updatedAt,
    timestamps: isRecord(value.timestamps)
      ? {
          created: toStringValue(value.timestamps.created) || createdAt.toISOString(),
          updated: toStringValue(value.timestamps.updated),
          lastBookAdded: toStringValue(value.timestamps.lastBookAdded),
        }
      : undefined,
    dateAdded: toStringValue(value.dateAdded) || createdAt.toISOString(),
    lastModified: toStringValue(value.lastModified) || updatedAt.toISOString(),
  };
};

const sanitizeLegacyBook = (value: unknown): Book | null => {
  if (!isRecord(value)) {
    return null;
  }

  const id = toStringValue(value.id);
  const title = toStringValue(value.title);

  if (!id || !title) {
    return null;
  }

  return {
    id,
    title,
    author: toStringValue(value.author) || 'Unknown Author',
    genre: Array.isArray(value.genre)
      ? toStringArray(value.genre)
      : toStringValue(value.genre),
    description: toStringValue(value.description),
    publishedDate: toStringValue(value.publishedDate),
    pageCount: toNumberValue(value.pageCount),
    thumbnail: toStringValue(value.thumbnail),
    googleBooksId: toStringValue(value.googleBooksId),
    openLibraryId: toStringValue(value.openLibraryId),
    sourceId: toStringValue(value.sourceId),
    sourceType: (() => {
      const sourceType = toStringValue(value.sourceType);
      return sourceType === 'google' || sourceType === 'openlib' || sourceType === 'manual'
        ? sourceType
        : undefined;
    })(),
    isbn10: toStringArray(value.isbn10),
    isbn13: toStringArray(value.isbn13),
    status: (() => {
      const status = toStringValue(value.status);
      return status === 'reading' ||
        status === 'completed' ||
        status === 'want-to-read' ||
        status === 'dnf' ||
        status === 'on-hold'
        ? status
        : undefined;
    })(),
    completedDate: toStringValue(value.completedDate),
    rating: toNumberValue(value.rating),
    notes: toStringValue(value.notes),
    progress: toNumberValue(value.progress),
    isPartOfSeries: toBooleanValue(value.isPartOfSeries),
    seriesId: toStringValue(value.seriesId),
    volumeNumber: toNumberValue(value.volumeNumber),
    seriesPosition: toNumberValue(value.seriesPosition),
    collectionIds: toStringArray(value.collectionIds),
    _legacySeriesName: toStringValue(value._legacySeriesName) || toStringValue(value.seriesName),
    _legacyNextBookTitle:
      toStringValue(value._legacyNextBookTitle) || toStringValue(value.nextBookTitle),
    _legacyNextBookExpectedYear:
      toNumberValue(value._legacyNextBookExpectedYear) || toNumberValue(value.nextBookExpectedYear),
    spineColor: toNumberValue(value.spineColor) ?? 1,
    addedDate:
      toStringValue(value.addedDate) ||
      toStringValue(value.dateAdded) ||
      new Date().toISOString(),
  };
};

const sanitizeLegacyCollection = (value: unknown): Collection | null => {
  if (!isRecord(value)) {
    return null;
  }

  const id = toStringValue(value.id);
  const name = toStringValue(value.name);

  if (!id || !name) {
    return null;
  }

  const createdAt =
    toDateValue(value.createdAt) || toDateValue(value.dateAdded) || new Date();
  const updatedAt =
    toDateValue(value.updatedAt) || toDateValue(value.lastModified) || createdAt;

  return {
    id,
    name,
    description: toStringValue(value.description),
    bookIds: toStringArray(value.bookIds) || [],
    color: toStringValue(value.color),
    imageUrl: toStringValue(value.imageUrl),
    createdAt,
    updatedAt,
  };
};

const sanitizeLegacyUpcomingRelease = (value: unknown): UpcomingBook | null => {
  if (!isRecord(value)) {
    return null;
  }

  const id = toStringValue(value.id);
  const title = toStringValue(value.title);
  const seriesId = toStringValue(value.seriesId);
  const seriesName = toStringValue(value.seriesName);

  if (!id || !title || !seriesId || !seriesName) {
    return null;
  }

  return {
    id,
    title,
    seriesId,
    seriesName,
    volumeNumber: toNumberValue(value.volumeNumber),
    author: toStringValue(value.author),
    expectedReleaseDate: toDateValue(value.expectedReleaseDate),
    coverImageUrl: toStringValue(value.coverImageUrl),
    preOrderLink: toStringValue(value.preOrderLink),
    synopsis: toStringValue(value.synopsis),
    isUserContributed: toBooleanValue(value.isUserContributed) ?? false,
    amazonProductId: toStringValue(value.amazonProductId),
  };
};

const sanitizeLegacyNotification = (value: unknown): Notification | null => {
  if (!isRecord(value)) {
    return null;
  }

  const id = toStringValue(value.id);
  const title = toStringValue(value.title);
  const message = toStringValue(value.message);
  const type = toStringValue(value.type);

  if (!id || !title || !message || !type || !ALLOWED_NOTIFICATION_TYPES.has(type as NotificationType)) {
    return null;
  }

  return {
    id,
    title,
    message,
    type: type as NotificationType,
    createdAt: toDateValue(value.createdAt) || new Date(),
    isRead: toBooleanValue(value.isRead) ?? false,
    isDismissed: toBooleanValue(value.isDismissed) ?? false,
    seriesId: toStringValue(value.seriesId),
    bookId: toStringValue(value.bookId),
    actionUrl: toStringValue(value.actionUrl),
  };
};

const incrementEntityCount = (
  entityCounts: Partial<Record<LegacyMigrationEntity, number>>,
  entity: LegacyMigrationEntity,
): void => {
  entityCounts[entity] = (entityCounts[entity] || 0) + 1;
};

const getImportTotal = (snapshot: LegacyLibrarySnapshot): number => {
  const baseCount =
    snapshot.books.length +
    snapshot.series.length +
    snapshot.collections.length +
    snapshot.upcomingReleases.length +
    snapshot.notifications.length;

  return snapshot.settings ? baseCount + 1 : baseCount;
};

const updateProgress = (
  onProgress: ImportProgressCallback | undefined,
  processed: number,
  total: number,
  summary: string,
  details?: string,
): void => {
  if (!onProgress) {
    return;
  }

  const progress = total === 0 ? 100 : Math.min(100, Math.round((processed / total) * 100));
  onProgress(progress, summary, details);
};

export const importLegacyLibrary = async (
  options: ImportOptions = {},
): Promise<LegacyImportExecutionResult> => {
  if (!getStoredAuthToken()) {
    throw new Error('Authenticated session required for legacy import.');
  }

  const snapshot = options.snapshot || (await collectLegacyLibrarySnapshot());
  const currentSettings = (await userSettingsRepository.get()) || defaultSettings;

  if (!snapshot.hasLegacyData) {
    return {
      status: 'skipped',
      importedCounts: {},
      updatedCounts: {},
      failures: [],
      snapshot,
    };
  }

  if (!options.force && hasCompletedLegacyImport(currentSettings)) {
    return {
      status: 'skipped',
      importedCounts: {},
      updatedCounts: {},
      failures: [],
      snapshot,
    };
  }

  const total = getImportTotal(snapshot);
  let processed = 0;
  const importedCounts: Partial<Record<LegacyMigrationEntity, number>> = {};
  const updatedCounts: Partial<Record<LegacyMigrationEntity, number>> = {};
  const failures: ImportFailure[] = [];
  const attemptTimestamp = new Date().toISOString();
  let workingSettings = mergeUserSettings(currentSettings, {
    migration: {
      legacyImport: buildLegacyImportStatus(snapshot, {
        status: 'in-progress',
        lastDetectedAt: snapshot.collectedAt,
        lastAttemptAt: attemptTimestamp,
      }),
    },
  });

  await userSettingsRepository.update(workingSettings);
  updateProgress(options.onProgress, 0, total, 'Starting legacy import', 'Preparing authenticated import');

  try {
    if (snapshot.settings) {
      const importedSettings = sanitizeLegacySettings(snapshot.settings);
      workingSettings = mergeUserSettings(workingSettings, importedSettings);
      await userSettingsRepository.update(workingSettings);
      processed += 1;
      incrementEntityCount(importedCounts, 'settings');
      updateProgress(options.onProgress, processed, total, 'Imported settings');
    }

    const sanitizedSeries = snapshot.series.map(sanitizeLegacySeries).filter((item): item is Series => Boolean(item));
    for (const series of sanitizedSeries) {
      try {
        const existingSeries = await seriesRepository.getById(series.id);

        if (existingSeries) {
          await seriesRepository.update(series.id, series);
          incrementEntityCount(updatedCounts, 'series');
        } else {
          await seriesRepository.add(series);
          incrementEntityCount(importedCounts, 'series');
        }
      } catch (error) {
        failures.push({
          entity: 'series',
          id: series.id,
          reason: error instanceof Error ? error.message : String(error),
        });
      } finally {
        processed += 1;
        updateProgress(options.onProgress, processed, total, 'Importing series', `${processed} of ${total} records processed`);
      }
    }

    const sanitizedBooks = snapshot.books.map(sanitizeLegacyBook).filter((item): item is Book => Boolean(item));
    for (const book of sanitizedBooks) {
      try {
        const existingBook = await bookRepository.getById(book.id);

        if (existingBook) {
          await bookRepository.update(book.id, book);
          incrementEntityCount(updatedCounts, 'books');
        } else {
          await bookRepository.create(book);
          incrementEntityCount(importedCounts, 'books');
        }
      } catch (error) {
        failures.push({
          entity: 'books',
          id: book.id,
          reason: error instanceof Error ? error.message : String(error),
        });
      } finally {
        processed += 1;
        updateProgress(options.onProgress, processed, total, 'Importing books', `${processed} of ${total} records processed`);
      }
    }

    const sanitizedCollections = snapshot.collections
      .map(sanitizeLegacyCollection)
      .filter((item): item is Collection => Boolean(item));
    for (const collection of sanitizedCollections) {
      try {
        const existingCollection = await collectionRepository.getById(collection.id);

        if (existingCollection) {
          await collectionRepository.update(collection.id, collection);
          incrementEntityCount(updatedCounts, 'collections');
        } else {
          await collectionRepository.add(collection);
          incrementEntityCount(importedCounts, 'collections');
        }
      } catch (error) {
        failures.push({
          entity: 'collections',
          id: collection.id,
          reason: error instanceof Error ? error.message : String(error),
        });
      } finally {
        processed += 1;
        updateProgress(options.onProgress, processed, total, 'Importing collections', `${processed} of ${total} records processed`);
      }
    }

    const sanitizedUpcomingReleases = snapshot.upcomingReleases
      .map(sanitizeLegacyUpcomingRelease)
      .filter((item): item is UpcomingBook => Boolean(item));
    for (const release of sanitizedUpcomingReleases) {
      try {
        const existingRelease = await upcomingReleasesRepository.getById(release.id);

        if (existingRelease) {
          await upcomingReleasesRepository.update(release.id, release);
          incrementEntityCount(updatedCounts, 'upcomingReleases');
        } else {
          await upcomingReleasesRepository.add(release);
          incrementEntityCount(importedCounts, 'upcomingReleases');
        }
      } catch (error) {
        failures.push({
          entity: 'upcomingReleases',
          id: release.id,
          reason: error instanceof Error ? error.message : String(error),
        });
      } finally {
        processed += 1;
        updateProgress(options.onProgress, processed, total, 'Importing upcoming releases', `${processed} of ${total} records processed`);
      }
    }

    const sanitizedNotifications = snapshot.notifications
      .map(sanitizeLegacyNotification)
      .filter((item): item is Notification => Boolean(item));
    for (const notification of sanitizedNotifications) {
      try {
        const existingNotification = await notificationRepository.getById(notification.id);

        if (existingNotification) {
          await notificationRepository.update(notification.id, notification);
          incrementEntityCount(updatedCounts, 'notifications');
        } else {
          await notificationRepository.add(notification);
          incrementEntityCount(importedCounts, 'notifications');
        }
      } catch (error) {
        failures.push({
          entity: 'notifications',
          id: notification.id,
          reason: error instanceof Error ? error.message : String(error),
        });
      } finally {
        processed += 1;
        updateProgress(options.onProgress, processed, total, 'Importing notifications', `${processed} of ${total} records processed`);
      }
    }
  } finally {
    const completedAt = new Date().toISOString();
    const finalStatus = failures.length > 0 ? 'failed' : 'completed';
    workingSettings = mergeUserSettings(workingSettings, {
      migration: {
        legacyImport: buildLegacyImportStatus(snapshot, {
          status: finalStatus,
          lastDetectedAt: snapshot.collectedAt,
          lastAttemptAt: attemptTimestamp,
          completedAt: finalStatus === 'completed' ? completedAt : undefined,
          postMigrationLocalCacheState: 'retained',
          lastError:
            failures.length > 0
              ? `${failures.length} records failed during import.`
              : undefined,
        }),
      },
    });

    await userSettingsRepository.update(workingSettings);
  }

  updateProgress(
    options.onProgress,
    total,
    total,
    failures.length > 0 ? 'Legacy import finished with issues' : 'Legacy import completed',
    failures.length > 0
      ? `${failures.length} records failed during import`
      : 'All available legacy records were imported',
  );

  return {
    status: failures.length > 0 ? 'failed' : 'completed',
    importedCounts,
    updatedCounts,
    failures,
    snapshot,
  };
};

export const getLegacyImportSummary = async (): Promise<LegacyLibrarySnapshot> => {
  return collectLegacyLibrarySnapshot();
};

export const canRunLegacyImport = async (): Promise<boolean> => {
  if (!getStoredAuthToken()) {
    return false;
  }

  const snapshot = await collectLegacyLibrarySnapshot();
  return snapshot.hasLegacyData;
};

export { LEGACY_IMPORT_ORDER };
