import { v4 as uuidv4 } from "uuid";

import { ApiError } from "./api-response.js";

const BOOK_STATUS_VALUES = [
  "reading",
  "completed",
  "want-to-read",
  "dnf",
  "on-hold",
] as const;

const BOOK_SOURCE_VALUES = ["google", "openlib", "manual"] as const;

type BookStatus = (typeof BOOK_STATUS_VALUES)[number];
type BookSource = (typeof BOOK_SOURCE_VALUES)[number];

export type BookPayload = {
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
  sourceType?: BookSource;
  isbn10?: string[];
  isbn13?: string[];
  status?: BookStatus;
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
};

type RawBookPayload = Partial<BookPayload> & Record<string, unknown>;

const assertObject = (value: unknown): RawBookPayload => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ApiError(400, "BAD_REQUEST", "Book payload must be an object.");
  }

  return value as RawBookPayload;
};

const normalizeOptionalString = (value: unknown): string | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new ApiError(400, "BAD_REQUEST", "Book field must be a string.");
  }

  const normalized = value.trim();
  return normalized || undefined;
};

const normalizeRequiredString = (
  value: unknown,
  fieldName: string,
): string => {
  const normalized = normalizeOptionalString(value);

  if (!normalized) {
    throw new ApiError(400, "BAD_REQUEST", `${fieldName} is required.`);
  }

  return normalized;
};

const normalizeStringArray = (value: unknown): string[] | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw new ApiError(400, "BAD_REQUEST", "Book field must be an array.");
  }

  const normalizedValues = value
    .map((entry) => normalizeOptionalString(entry))
    .filter((entry): entry is string => Boolean(entry));

  return normalizedValues.length ? normalizedValues : undefined;
};

const normalizeGenre = (value: unknown): string | string[] | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === "string") {
    return normalizeOptionalString(value);
  }

  return normalizeStringArray(value);
};

const normalizeOptionalNumber = (
  value: unknown,
  fieldName: string,
): number | undefined => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new ApiError(400, "BAD_REQUEST", `${fieldName} must be a number.`);
  }

  return value;
};

const normalizePositiveInteger = (
  value: unknown,
  fieldName: string,
): number | undefined => {
  const normalized = normalizeOptionalNumber(value, fieldName);

  if (normalized === undefined) {
    return undefined;
  }

  if (!Number.isInteger(normalized) || normalized < 0) {
    throw new ApiError(
      400,
      "BAD_REQUEST",
      `${fieldName} must be a positive whole number.`,
    );
  }

  return normalized;
};

const normalizeStatus = (value: unknown): BookStatus | undefined => {
  const normalized = normalizeOptionalString(value);

  if (!normalized) {
    return undefined;
  }

  if (!BOOK_STATUS_VALUES.includes(normalized as BookStatus)) {
    throw new ApiError(400, "BAD_REQUEST", "Book status is invalid.");
  }

  return normalized as BookStatus;
};

const normalizeSourceType = (value: unknown): BookSource | undefined => {
  const normalized = normalizeOptionalString(value);

  if (!normalized) {
    return undefined;
  }

  if (!BOOK_SOURCE_VALUES.includes(normalized as BookSource)) {
    throw new ApiError(400, "BAD_REQUEST", "Book source type is invalid.");
  }

  return normalized as BookSource;
};

const normalizeProgress = (value: unknown): number | undefined => {
  const normalized = normalizeOptionalNumber(value, "Book progress");

  if (normalized === undefined) {
    return undefined;
  }

  if (normalized < 0 || normalized > 1) {
    throw new ApiError(
      400,
      "BAD_REQUEST",
      "Book progress must be between 0 and 1.",
    );
  }

  return normalized;
};

const normalizeRating = (value: unknown): number | undefined => {
  const normalized = normalizePositiveInteger(value, "Book rating");

  if (normalized === undefined) {
    return undefined;
  }

  if (normalized < 1 || normalized > 5) {
    throw new ApiError(400, "BAD_REQUEST", "Book rating must be between 1 and 5.");
  }

  return normalized;
};

const normalizeSpineColor = (
  value: unknown,
  fallback?: number,
): number => {
  const normalized = normalizePositiveInteger(value, "Book spine color");

  if (normalized === undefined) {
    if (fallback !== undefined) {
      return fallback;
    }

    throw new ApiError(400, "BAD_REQUEST", "Book spine color is required.");
  }

  if (normalized < 1 || normalized > 8) {
    throw new ApiError(400, "BAD_REQUEST", "Book spine color must be between 1 and 8.");
  }

  return normalized;
};

const normalizeDateString = (
  value: unknown,
  fieldName: string,
): string | undefined => {
  const normalized = normalizeOptionalString(value);

  if (!normalized) {
    return undefined;
  }

  const parsedDate = new Date(normalized);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new ApiError(400, "BAD_REQUEST", `${fieldName} must be a valid date.`);
  }

  return normalized;
};

const normalizeBoolean = (
  value: unknown,
  fallback?: boolean,
): boolean | undefined => {
  if (value === undefined || value === null) {
    return fallback;
  }

  if (typeof value !== "boolean") {
    throw new ApiError(400, "BAD_REQUEST", "Book field must be a boolean.");
  }

  return value;
};

export const validateCreateBookPayload = (value: unknown): BookPayload => {
  const payload = assertObject(value);
  const now = new Date().toISOString();

  return {
    id: normalizeOptionalString(payload.id) || `book-${uuidv4()}`,
    title: normalizeRequiredString(payload.title, "Book title"),
    author: normalizeRequiredString(payload.author, "Book author"),
    genre: normalizeGenre(payload.genre),
    description: normalizeOptionalString(payload.description),
    publishedDate: normalizeDateString(payload.publishedDate, "Book published date"),
    pageCount: normalizePositiveInteger(payload.pageCount, "Book page count"),
    thumbnail: normalizeOptionalString(payload.thumbnail),
    googleBooksId: normalizeOptionalString(payload.googleBooksId),
    openLibraryId: normalizeOptionalString(payload.openLibraryId),
    sourceId: normalizeOptionalString(payload.sourceId),
    sourceType: normalizeSourceType(payload.sourceType),
    isbn10: normalizeStringArray(payload.isbn10),
    isbn13: normalizeStringArray(payload.isbn13),
    status: normalizeStatus(payload.status),
    completedDate: normalizeDateString(payload.completedDate, "Book completed date"),
    rating: normalizeRating(payload.rating),
    notes: normalizeOptionalString(payload.notes),
    progress: normalizeProgress(payload.progress),
    isPartOfSeries: normalizeBoolean(payload.isPartOfSeries, false),
    seriesId: normalizeOptionalString(payload.seriesId),
    volumeNumber: normalizePositiveInteger(payload.volumeNumber, "Book volume number"),
    seriesPosition: normalizePositiveInteger(
      payload.seriesPosition,
      "Book series position",
    ),
    collectionIds: normalizeStringArray(payload.collectionIds),
    _legacySeriesName: normalizeOptionalString(payload._legacySeriesName),
    _legacyNextBookTitle: normalizeOptionalString(payload._legacyNextBookTitle),
    _legacyNextBookExpectedYear: normalizePositiveInteger(
      payload._legacyNextBookExpectedYear,
      "Legacy next book expected year",
    ),
    spineColor: normalizeSpineColor(payload.spineColor),
    addedDate: normalizeDateString(payload.addedDate, "Book added date") || now,
  };
};

export const validateUpdateBookPayload = (
  value: unknown,
): Partial<BookPayload> => {
  const payload = assertObject(value);
  const updates: Partial<BookPayload> = {};

  if ("title" in payload) {
    updates.title = normalizeRequiredString(payload.title, "Book title");
  }

  if ("author" in payload) {
    updates.author = normalizeRequiredString(payload.author, "Book author");
  }

  if ("genre" in payload) {
    updates.genre = normalizeGenre(payload.genre);
  }

  if ("description" in payload) {
    updates.description = normalizeOptionalString(payload.description);
  }

  if ("publishedDate" in payload) {
    updates.publishedDate = normalizeDateString(
      payload.publishedDate,
      "Book published date",
    );
  }

  if ("pageCount" in payload) {
    updates.pageCount = normalizePositiveInteger(
      payload.pageCount,
      "Book page count",
    );
  }

  if ("thumbnail" in payload) {
    updates.thumbnail = normalizeOptionalString(payload.thumbnail);
  }

  if ("googleBooksId" in payload) {
    updates.googleBooksId = normalizeOptionalString(payload.googleBooksId);
  }

  if ("openLibraryId" in payload) {
    updates.openLibraryId = normalizeOptionalString(payload.openLibraryId);
  }

  if ("sourceId" in payload) {
    updates.sourceId = normalizeOptionalString(payload.sourceId);
  }

  if ("sourceType" in payload) {
    updates.sourceType = normalizeSourceType(payload.sourceType);
  }

  if ("isbn10" in payload) {
    updates.isbn10 = normalizeStringArray(payload.isbn10);
  }

  if ("isbn13" in payload) {
    updates.isbn13 = normalizeStringArray(payload.isbn13);
  }

  if ("status" in payload) {
    updates.status = normalizeStatus(payload.status);
  }

  if ("completedDate" in payload) {
    updates.completedDate = normalizeDateString(
      payload.completedDate,
      "Book completed date",
    );
  }

  if ("rating" in payload) {
    updates.rating = normalizeRating(payload.rating);
  }

  if ("notes" in payload) {
    updates.notes = normalizeOptionalString(payload.notes);
  }

  if ("progress" in payload) {
    updates.progress = normalizeProgress(payload.progress);
  }

  if ("isPartOfSeries" in payload) {
    updates.isPartOfSeries = normalizeBoolean(payload.isPartOfSeries);
  }

  if ("seriesId" in payload) {
    updates.seriesId = normalizeOptionalString(payload.seriesId);
  }

  if ("volumeNumber" in payload) {
    updates.volumeNumber = normalizePositiveInteger(
      payload.volumeNumber,
      "Book volume number",
    );
  }

  if ("seriesPosition" in payload) {
    updates.seriesPosition = normalizePositiveInteger(
      payload.seriesPosition,
      "Book series position",
    );
  }

  if ("collectionIds" in payload) {
    updates.collectionIds = normalizeStringArray(payload.collectionIds);
  }

  if ("_legacySeriesName" in payload) {
    updates._legacySeriesName = normalizeOptionalString(payload._legacySeriesName);
  }

  if ("_legacyNextBookTitle" in payload) {
    updates._legacyNextBookTitle = normalizeOptionalString(
      payload._legacyNextBookTitle,
    );
  }

  if ("_legacyNextBookExpectedYear" in payload) {
    updates._legacyNextBookExpectedYear = normalizePositiveInteger(
      payload._legacyNextBookExpectedYear,
      "Legacy next book expected year",
    );
  }

  if ("spineColor" in payload) {
    updates.spineColor = normalizeSpineColor(payload.spineColor);
  }

  if ("addedDate" in payload) {
    updates.addedDate = normalizeDateString(payload.addedDate, "Book added date");
  }

  return updates;
};
