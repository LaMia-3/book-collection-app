import {
  AuthUser,
  clearStoredAuthSession,
  getStoredAuthToken,
} from "@/lib/auth-storage";
import type { UserSettings } from "@/types/user-settings";

type ApiErrorPayload = {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
};

type ApiRequestOptions = {
  auth?: boolean;
  body?: unknown;
  headers?: HeadersInit;
  method?: string;
};

type AuthResponse = {
  token: string;
  user: AuthUser;
};

type PasswordResetRequestResponse = {
  success: boolean;
  message: string;
};

type PasswordResetValidationResponse = {
  valid: boolean;
  expiresAt: string;
};

type BookRecord = {
  id: string;
  title: string;
  author: string;
  genre?: string | string[];
  description?: string;
  publishedDate?: string;
  pageCount?: number;
  thumbnail?: string;
  googleBooksId?: string;
  openLibraryId?: string;
  sourceId?: string;
  sourceType?: "google" | "openlib" | "manual";
  isbn10?: string[];
  isbn13?: string[];
  status?: "reading" | "completed" | "want-to-read" | "dnf" | "on-hold";
  completedDate?: string;
  rating?: number;
  notes?: string;
  progress?: number;
  isPartOfSeries?: boolean;
  seriesId?: string;
  volumeNumber?: number;
  seriesPosition?: number;
  collectionIds?: string[];
  _legacySeriesName?: string;
  _legacyNextBookTitle?: string;
  _legacyNextBookExpectedYear?: number;
  spineColor: number;
  addedDate: string;
  createdAt?: string;
  updatedAt?: string;
};

export type SeriesRecord = {
  id: string;
  name: string;
  description?: string;
  author?: string;
  coverImage?: string;
  books: string[];
  totalBooks?: number;
  readingOrder: "publication" | "chronological" | "custom";
  customOrder?: string[];
  status?: "ongoing" | "completed" | "cancelled";
  genre?: string[];
  isTracked: boolean;
  hasUpcoming?: boolean;
  apiEnriched?: boolean;
  timestamps?: {
    created: string;
    updated?: string;
    lastBookAdded?: string;
  };
  dateAdded: string;
  lastModified?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type CollectionRecord = {
  id: string;
  name: string;
  description?: string;
  bookIds: string[];
  color?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
};

export type UpcomingReleaseRecord = {
  id: string;
  title: string;
  seriesId: string;
  seriesName: string;
  volumeNumber?: number;
  author?: string;
  expectedReleaseDate?: string;
  coverImageUrl?: string;
  preOrderLink?: string;
  synopsis?: string;
  isUserContributed: boolean;
  amazonProductId?: string;
};

export type NotificationRecord = {
  id: string;
  title: string;
  message: string;
  type: "release" | "system" | "update" | "alert";
  createdAt: string;
  isRead: boolean;
  isDismissed: boolean;
  seriesId?: string;
  bookId?: string;
  actionUrl?: string;
};

export class ApiClientError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(status: number, message: string, code?: string, details?: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const getApiBaseUrl = (): string => {
  const configuredBaseUrl = import.meta.env.VITE_API_URL?.trim();

  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/$/, "");
  }

  return "/api";
};

const buildHeaders = (auth = false, headers?: HeadersInit): Headers => {
  const requestHeaders = new Headers(headers);

  if (!requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  if (auth) {
    const token = getStoredAuthToken();

    if (token) {
      requestHeaders.set("Authorization", `Bearer ${token}`);
    }
  }

  return requestHeaders;
};

const parseResponseBody = async (response: Response): Promise<unknown> => {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
};

export const apiRequest = async <T>(
  path: string,
  { auth = false, body, headers, method = "GET" }: ApiRequestOptions = {},
): Promise<T> => {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method,
    headers: buildHeaders(auth, headers),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const responseBody = await parseResponseBody(response);

  if (!response.ok) {
    const errorPayload =
      typeof responseBody === "object" && responseBody !== null
        ? (responseBody as ApiErrorPayload)
        : undefined;

    if (response.status === 401 && auth) {
      clearStoredAuthSession();
    }

    throw new ApiClientError(
      response.status,
      errorPayload?.error?.message || "Request failed.",
      errorPayload?.error?.code,
      errorPayload?.error?.details,
    );
  }

  return responseBody as T;
};

export const authApi = {
  login: (payload: { email: string; password: string }) =>
    apiRequest<AuthResponse>("/auth/login", {
      method: "POST",
      body: payload,
    }),
  register: (payload: {
    email: string;
    password: string;
    preferredName?: string;
  }) =>
    apiRequest<AuthResponse>("/auth/register", {
      method: "POST",
      body: payload,
    }),
  me: () =>
    apiRequest<AuthUser>("/auth/me", {
      auth: true,
    }),
  deleteAccount: () =>
    apiRequest<{ success: boolean }>("/auth/account", {
      auth: true,
      method: "DELETE",
    }),
  requestPasswordReset: (payload: { email: string }) =>
    apiRequest<PasswordResetRequestResponse>("/auth/forgot-password", {
      method: "POST",
      body: payload,
    }),
  verifyPasswordResetOtp: (payload: { email: string; otp: string }) =>
    apiRequest<PasswordResetValidationResponse>(
      "/auth/verify-reset-otp",
      {
        method: "POST",
        body: payload,
      },
    ),
  resetPassword: (payload: { email: string; otp: string; password: string }) =>
    apiRequest<PasswordResetRequestResponse>("/auth/reset-password", {
      method: "POST",
      body: payload,
    }),
};

export const booksApi = {
  getAll: () =>
    apiRequest<BookRecord[]>("/books", {
      auth: true,
    }),
  getById: (id: string) =>
    apiRequest<BookRecord>(`/books/${id}`, {
      auth: true,
    }),
  create: (payload: BookRecord) =>
    apiRequest<BookRecord>("/books", {
      auth: true,
      method: "POST",
      body: payload,
    }),
  update: (id: string, payload: Partial<BookRecord>) =>
    apiRequest<BookRecord>(`/books/${id}`, {
      auth: true,
      method: "PUT",
      body: payload,
    }),
  delete: (id: string) =>
    apiRequest<{ success: boolean }>(`/books/${id}`, {
      auth: true,
      method: "DELETE",
    }),
};

export const seriesApi = {
  getAll: () =>
    apiRequest<SeriesRecord[]>("/series", {
      auth: true,
    }),
  getById: (id: string) =>
    apiRequest<SeriesRecord>(`/series/${id}`, {
      auth: true,
    }),
  create: (payload: SeriesRecord) =>
    apiRequest<SeriesRecord>("/series", {
      auth: true,
      method: "POST",
      body: payload,
    }),
  update: (id: string, payload: Partial<SeriesRecord>) =>
    apiRequest<SeriesRecord>(`/series/${id}`, {
      auth: true,
      method: "PUT",
      body: payload,
    }),
  delete: (id: string) =>
    apiRequest<{ success: boolean }>(`/series/${id}`, {
      auth: true,
      method: "DELETE",
    }),
};

export const collectionsApi = {
  getAll: () =>
    apiRequest<CollectionRecord[]>("/collections", {
      auth: true,
    }),
  getById: (id: string) =>
    apiRequest<CollectionRecord>(`/collections/${id}`, {
      auth: true,
    }),
  create: (payload: CollectionRecord) =>
    apiRequest<CollectionRecord>("/collections", {
      auth: true,
      method: "POST",
      body: payload,
    }),
  update: (id: string, payload: Partial<CollectionRecord>) =>
    apiRequest<CollectionRecord>(`/collections/${id}`, {
      auth: true,
      method: "PUT",
      body: payload,
    }),
  delete: (id: string) =>
    apiRequest<{ success: boolean }>(`/collections/${id}`, {
      auth: true,
      method: "DELETE",
    }),
};

export const userSettingsApi = {
  get: () =>
    apiRequest<UserSettings | null>("/user-settings", {
      auth: true,
    }),
  update: (payload: UserSettings) =>
    apiRequest<UserSettings>("/user-settings", {
      auth: true,
      method: "PUT",
      body: payload,
    }),
};

export const upcomingReleasesApi = {
  getAll: () =>
    apiRequest<UpcomingReleaseRecord[]>("/upcoming-releases", {
      auth: true,
    }),
  getById: (id: string) =>
    apiRequest<UpcomingReleaseRecord>(`/upcoming-releases/${id}`, {
      auth: true,
    }),
  create: (payload: UpcomingReleaseRecord) =>
    apiRequest<UpcomingReleaseRecord>("/upcoming-releases", {
      auth: true,
      method: "POST",
      body: payload,
    }),
  update: (id: string, payload: Partial<UpcomingReleaseRecord>) =>
    apiRequest<UpcomingReleaseRecord>(`/upcoming-releases/${id}`, {
      auth: true,
      method: "PUT",
      body: payload,
    }),
  delete: (id: string) =>
    apiRequest<{ success: boolean }>(`/upcoming-releases/${id}`, {
      auth: true,
      method: "DELETE",
    }),
};

export const notificationsApi = {
  getAll: () =>
    apiRequest<NotificationRecord[]>("/notifications", {
      auth: true,
    }),
  getById: (id: string) =>
    apiRequest<NotificationRecord>(`/notifications/${id}`, {
      auth: true,
    }),
  create: (payload: NotificationRecord) =>
    apiRequest<NotificationRecord>("/notifications", {
      auth: true,
      method: "POST",
      body: payload,
    }),
  update: (id: string, payload: Partial<NotificationRecord>) =>
    apiRequest<NotificationRecord>(`/notifications/${id}`, {
      auth: true,
      method: "PUT",
      body: payload,
    }),
  delete: (id: string) =>
    apiRequest<{ success: boolean }>(`/notifications/${id}`, {
      auth: true,
      method: "DELETE",
    }),
};
