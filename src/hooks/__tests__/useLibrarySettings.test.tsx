import { renderHook, act } from "@testing-library/react";

import { useLibrarySettings } from "@/hooks/useLibrarySettings";

const mockToast = jest.fn();
const mockDeleteAccount = jest.fn();
const mockLogout = jest.fn();
const mockNotifyStorageReset = jest.fn();

const mockBookRepository = {
  create: jest.fn(),
  delete: jest.fn(),
  getAll: jest.fn(),
  getById: jest.fn(),
  update: jest.fn(),
};

const mockSeriesRepository = {
  add: jest.fn(),
  delete: jest.fn(),
  getAll: jest.fn(),
  getById: jest.fn(),
  update: jest.fn(),
};

const mockCollectionRepository = {
  add: jest.fn(),
  delete: jest.fn(),
  getAll: jest.fn(),
  getById: jest.fn(),
  update: jest.fn(),
};

const mockNotificationRepository = {
  delete: jest.fn(),
  getAll: jest.fn(),
};

const mockUpcomingReleasesRepository = {
  delete: jest.fn(),
  getAll: jest.fn(),
};

let mockIsAuthenticated = false;

jest.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

jest.mock("@/contexts/SettingsContext", () => ({
  useSettings: () => ({
    settings: {},
  }),
}));

jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    deleteAccount: mockDeleteAccount,
    isAuthenticated: mockIsAuthenticated,
    logout: mockLogout,
    user: null,
  }),
}));

jest.mock("@/services/storage/CacheResetListener", () => ({
  notifyStorageReset: (...args: unknown[]) => mockNotifyStorageReset(...args),
}));

jest.mock("@/repositories/BookRepository", () => ({
  bookRepository: mockBookRepository,
}));

jest.mock("@/repositories/SeriesRepository", () => ({
  seriesRepository: mockSeriesRepository,
}));

jest.mock("@/repositories/CollectionRepository", () => ({
  collectionRepository: mockCollectionRepository,
}));

jest.mock("@/repositories/NotificationRepository", () => ({
  notificationRepository: mockNotificationRepository,
}));

jest.mock("@/repositories/UpcomingReleasesRepository", () => ({
  upcomingReleasesRepository: mockUpcomingReleasesRepository,
}));

const seedLegacyLocalStorage = () => {
  localStorage.setItem("bookLibrary", "books");
  localStorage.setItem("seriesLibrary", "series");
  localStorage.setItem("collections", "collections");
};

const installIndexedDbMock = () => {
  const open = jest.fn((dbName: string) => {
    const request: {
      onerror: ((event?: unknown) => void) | null;
      onsuccess: ((event?: unknown) => void) | null;
      result?: unknown;
    } = {
      onerror: null,
      onsuccess: null,
    };

    const db = {
      close: jest.fn(),
      objectStoreNames: ["books", "series", "collections", "upcomingReleases", "notifications"],
      transaction: jest.fn((storeName: string) => {
        let clearCompleted = false;
        let clearSuccessHandler: ((event?: unknown) => void) | null = null;
        let transactionCompleteHandler: ((event?: unknown) => void) | null = null;

        const transaction: {
          onabort: ((event?: unknown) => void) | null;
          oncomplete: ((event?: unknown) => void) | null;
          onerror: ((event?: unknown) => void) | null;
          objectStore?: jest.Mock;
        } = {
          onabort: null,
          oncomplete: null,
          onerror: null,
        };

        const clearRequest: {
          onerror: ((event?: unknown) => void) | null;
          onsuccess: ((event?: unknown) => void) | null;
        } = {
          onerror: null,
          onsuccess: null,
        };

        Object.defineProperty(clearRequest, "onsuccess", {
          configurable: true,
          get: () => clearSuccessHandler,
          set: (handler: ((event?: unknown) => void) | null) => {
            clearSuccessHandler = handler;

            if (clearCompleted && clearSuccessHandler) {
              clearSuccessHandler({});
            }
          },
        });

        Object.defineProperty(transaction, "oncomplete", {
          configurable: true,
          get: () => transactionCompleteHandler,
          set: (handler: ((event?: unknown) => void) | null) => {
            transactionCompleteHandler = handler;

            if (clearCompleted && transactionCompleteHandler) {
              transactionCompleteHandler({});
            }
          },
        });

        const objectStore = {
          clear: jest.fn(() => {
            clearCompleted = true;
            clearSuccessHandler?.({});
            transactionCompleteHandler?.({});
            return clearRequest;
          }),
        };

        transaction.objectStore = jest.fn(() => objectStore);

        return transaction;
      }),
    };

    request.result = db;

    Object.defineProperty(request, "onsuccess", {
      configurable: true,
      get: () => null,
      set: (handler: ((event?: unknown) => void) | null) => {
        if (handler) {
          handler({});
        }
      },
    });

    return request;
  });

  Object.defineProperty(window, "indexedDB", {
    configurable: true,
    value: { open },
  });
};

describe("useLibrarySettings destructive actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockIsAuthenticated = false;
    localStorage.clear();
    seedLegacyLocalStorage();

    mockBookRepository.getAll.mockResolvedValue([]);
    mockSeriesRepository.getAll.mockResolvedValue([]);
    mockCollectionRepository.getAll.mockResolvedValue([]);
    mockNotificationRepository.getAll.mockResolvedValue([]);
    mockUpcomingReleasesRepository.getAll.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it("clears books while preserving series and collections during Clear Books", async () => {
    mockBookRepository.getAll.mockResolvedValue([
      { id: "book-1", title: "Book One" },
      { id: "book-2", title: "Book Two" },
    ]);
    mockCollectionRepository.getAll.mockResolvedValue([
      { id: "collection-1", bookIds: ["book-1", "book-2"] },
    ]);
    mockSeriesRepository.getAll.mockResolvedValue([
      { id: "series-1", books: ["book-1", "book-2"], customOrder: ["book-1", "book-2"] },
    ]);
    mockNotificationRepository.getAll.mockResolvedValue([
      { id: "notification-1", bookId: "book-1" },
      { id: "notification-2", bookId: "other-book" },
    ]);

    const { result } = renderHook(() => useLibrarySettings());

    await act(async () => {
      await result.current.onDeleteLibrary();
    });

    expect(mockCollectionRepository.update).toHaveBeenCalledWith("collection-1", {
      bookIds: [],
    });
    expect(mockSeriesRepository.update).toHaveBeenCalledWith("series-1", {
      books: [],
      customOrder: [],
    });
    expect(mockNotificationRepository.delete).toHaveBeenCalledWith("notification-1");
    expect(mockNotificationRepository.delete).not.toHaveBeenCalledWith("notification-2");
    expect(mockBookRepository.delete).toHaveBeenCalledWith("book-1");
    expect(mockBookRepository.delete).toHaveBeenCalledWith("book-2");
    expect(localStorage.getItem("bookLibrary")).toBeNull();
    expect(localStorage.getItem("seriesLibrary")).toBeNull();
    expect(localStorage.getItem("collections")).toBeNull();
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Library Deleted",
      }),
    );

  });

  it("removes books, series, collections, upcoming releases, and notifications during Start Fresh", async () => {
    installIndexedDbMock();

    mockBookRepository.getAll.mockResolvedValue([
      { id: "book-1" },
      { id: "book-2" },
    ]);
    mockSeriesRepository.getAll.mockResolvedValue([{ id: "series-1" }]);
    mockCollectionRepository.getAll.mockResolvedValue([{ id: "collection-1" }]);
    mockUpcomingReleasesRepository.getAll.mockResolvedValue([{ id: "upcoming-1" }]);
    mockNotificationRepository.getAll.mockResolvedValue([{ id: "notification-1" }]);

    const { result } = renderHook(() => useLibrarySettings());

    await act(async () => {
      await result.current.onResetLibrary();
    });

    expect(mockNotificationRepository.delete).toHaveBeenCalledWith("notification-1");
    expect(mockUpcomingReleasesRepository.delete).toHaveBeenCalledWith("upcoming-1");
    expect(mockCollectionRepository.delete).toHaveBeenCalledWith("collection-1");
    expect(mockSeriesRepository.delete).toHaveBeenCalledWith("series-1");
    expect(mockBookRepository.delete).toHaveBeenCalledWith("book-1");
    expect(mockBookRepository.delete).toHaveBeenCalledWith("book-2");
    expect(mockNotifyStorageReset).toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Library Reset Complete",
      }),
    );

  });
});
