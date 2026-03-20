jest.mock("@/lib/auth-storage", () => ({
  getStoredAuthToken: jest.fn(),
}));

jest.mock("@/repositories/BookRepository", () => ({
  bookRepository: {
    create: jest.fn(),
    getById: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock("@/repositories/CollectionRepository", () => ({
  collectionRepository: {
    add: jest.fn(),
    getById: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock("@/repositories/NotificationRepository", () => ({
  notificationRepository: {
    add: jest.fn(),
    getById: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock("@/repositories/SeriesRepository", () => ({
  seriesRepository: {
    add: jest.fn(),
    getById: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock("@/repositories/UpcomingReleasesRepository", () => ({
  upcomingReleasesRepository: {
    add: jest.fn(),
    getById: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock("@/repositories/UserSettingsRepository", () => ({
  userSettingsRepository: {
    get: jest.fn(),
    update: jest.fn(),
  },
}));

import { getStoredAuthToken } from "@/lib/auth-storage";
import { bookRepository } from "@/repositories/BookRepository";
import { collectionRepository } from "@/repositories/CollectionRepository";
import { notificationRepository } from "@/repositories/NotificationRepository";
import { seriesRepository } from "@/repositories/SeriesRepository";
import { upcomingReleasesRepository } from "@/repositories/UpcomingReleasesRepository";
import { userSettingsRepository } from "@/repositories/UserSettingsRepository";
import type { LegacyLibrarySnapshot } from "@/services/migration/legacyLibraryMigration";
import { importLegacyLibrary } from "@/services/migration/legacyLibraryImport";

const createSnapshot = (): LegacyLibrarySnapshot => ({
  hasLegacyData: true,
  indexedDb: [
    {
      name: "book-collection-db",
      version: 3,
      stores: {
        settings: 1,
        series: 1,
        books: 1,
        collections: 1,
        upcomingReleases: 1,
        notifications: 1,
      },
    },
  ],
  localStorage: {
    stores: {},
    keys: [],
  },
  totalCounts: {
    settings: 1,
    series: 1,
    books: 1,
    collections: 1,
    upcomingReleases: 1,
    notifications: 1,
  },
  collectedAt: "2026-03-19T12:00:00.000Z",
  canonicalImportOrder: [
    "settings",
    "series",
    "books",
    "collections",
    "upcomingReleases",
    "notifications",
  ],
  duplicateStrategy: "prefer-primary-indexeddb-then-fallback-upsert-by-id",
  sourceDatabases: ["book-collection-db"],
  settings: {
    preferredName: "Imported Reader",
    defaultView: "shelf",
  },
  books: [
    {
      id: "book-1",
      title: "Imported Book",
      author: "Imported Author",
      status: "reading",
      addedDate: "2026-03-10T00:00:00.000Z",
    },
  ],
  series: [
    {
      id: "series-1",
      name: "Imported Series",
      books: ["book-1"],
      readingOrder: "publication",
      createdAt: "2026-03-10T00:00:00.000Z",
      updatedAt: "2026-03-11T00:00:00.000Z",
    },
  ],
  collections: [
    {
      id: "collection-1",
      name: "Imported Collection",
      bookIds: ["book-1"],
      createdAt: "2026-03-10T00:00:00.000Z",
      updatedAt: "2026-03-11T00:00:00.000Z",
    },
  ],
  upcomingReleases: [
    {
      id: "release-1",
      title: "Upcoming Book",
      seriesId: "series-1",
      seriesName: "Imported Series",
    },
  ],
  notifications: [
    {
      id: "notification-1",
      title: "Release Alert",
      message: "A new release is coming",
      type: "release",
      createdAt: "2026-03-12T00:00:00.000Z",
      isRead: false,
      isDismissed: false,
      bookId: "book-1",
    },
  ],
});

describe("importLegacyLibrary", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (getStoredAuthToken as jest.Mock).mockReturnValue("token");
    (userSettingsRepository.get as jest.Mock).mockResolvedValue(null);
    (userSettingsRepository.update as jest.Mock).mockImplementation(async (value) => value);

    (seriesRepository.getById as jest.Mock).mockResolvedValue(null);
    (seriesRepository.add as jest.Mock).mockResolvedValue(undefined);
    (seriesRepository.update as jest.Mock).mockResolvedValue(undefined);

    (bookRepository.getById as jest.Mock).mockResolvedValue(null);
    (bookRepository.create as jest.Mock).mockResolvedValue(undefined);
    (bookRepository.update as jest.Mock).mockResolvedValue(undefined);

    (collectionRepository.getById as jest.Mock).mockResolvedValue(null);
    (collectionRepository.add as jest.Mock).mockResolvedValue(undefined);
    (collectionRepository.update as jest.Mock).mockResolvedValue(undefined);

    (upcomingReleasesRepository.getById as jest.Mock).mockResolvedValue(null);
    (upcomingReleasesRepository.add as jest.Mock).mockResolvedValue(undefined);
    (upcomingReleasesRepository.update as jest.Mock).mockResolvedValue(undefined);

    (notificationRepository.getById as jest.Mock).mockResolvedValue(null);
    (notificationRepository.add as jest.Mock).mockResolvedValue(undefined);
    (notificationRepository.update as jest.Mock).mockResolvedValue(undefined);
  });

  it("imports legacy snapshot data into the authenticated account", async () => {
    const result = await importLegacyLibrary({
      snapshot: createSnapshot(),
    });

    expect(userSettingsRepository.update).toHaveBeenCalledTimes(3);
    expect(seriesRepository.add).toHaveBeenCalledTimes(1);
    expect(bookRepository.create).toHaveBeenCalledTimes(1);
    expect(collectionRepository.add).toHaveBeenCalledTimes(1);
    expect(upcomingReleasesRepository.add).toHaveBeenCalledTimes(1);
    expect(notificationRepository.add).toHaveBeenCalledTimes(1);

    expect(result.status).toBe("completed");
    expect(result.importedCounts).toEqual({
      settings: 1,
      series: 1,
      books: 1,
      collections: 1,
      upcomingReleases: 1,
      notifications: 1,
    });
    expect(result.updatedCounts).toEqual({});
    expect(result.failures).toEqual([]);
  });

  it("updates existing records on retry instead of creating duplicates", async () => {
    const currentSettings = {
      migration: {
        legacyImport: {
          status: "failed",
        },
      },
    };

    (userSettingsRepository.get as jest.Mock).mockResolvedValue(currentSettings);
    (seriesRepository.getById as jest.Mock).mockResolvedValue({ id: "series-1" });
    (bookRepository.getById as jest.Mock).mockResolvedValue({ id: "book-1" });
    (collectionRepository.getById as jest.Mock).mockResolvedValue({ id: "collection-1" });
    (upcomingReleasesRepository.getById as jest.Mock).mockResolvedValue({ id: "release-1" });
    (notificationRepository.getById as jest.Mock).mockResolvedValue({ id: "notification-1" });

    const result = await importLegacyLibrary({
      force: true,
      snapshot: createSnapshot(),
    });

    expect(seriesRepository.add).not.toHaveBeenCalled();
    expect(bookRepository.create).not.toHaveBeenCalled();
    expect(collectionRepository.add).not.toHaveBeenCalled();
    expect(upcomingReleasesRepository.add).not.toHaveBeenCalled();
    expect(notificationRepository.add).not.toHaveBeenCalled();

    expect(seriesRepository.update).toHaveBeenCalledTimes(1);
    expect(bookRepository.update).toHaveBeenCalledTimes(1);
    expect(collectionRepository.update).toHaveBeenCalledTimes(1);
    expect(upcomingReleasesRepository.update).toHaveBeenCalledTimes(1);
    expect(notificationRepository.update).toHaveBeenCalledTimes(1);

    expect(result.status).toBe("completed");
    expect(result.importedCounts).toEqual({
      settings: 1,
    });
    expect(result.updatedCounts).toEqual({
      series: 1,
      books: 1,
      collections: 1,
      upcomingReleases: 1,
      notifications: 1,
    });
    expect(result.failures).toEqual([]);
  });
});
