import { v4 as uuidv4 } from "uuid";

import { ApiError } from "./api-response.js";

const SERIES_READING_ORDER_VALUES = [
  "publication",
  "chronological",
  "custom",
] as const;

const SERIES_STATUS_VALUES = ["ongoing", "completed", "cancelled"] as const;

type SeriesReadingOrder = (typeof SERIES_READING_ORDER_VALUES)[number];
type SeriesStatus = (typeof SERIES_STATUS_VALUES)[number];

type SeriesTimestampsPayload = {
  created: string;
  updated?: string;
  lastBookAdded?: string;
};

export type SeriesPayload = {
  id: string;
  name: string;
  description?: string;
  author?: string;
  coverImage?: string;
  books: string[];
  totalBooks?: number;
  readingOrder: SeriesReadingOrder;
  customOrder?: string[];
  status?: SeriesStatus;
  genre?: string[];
  isTracked: boolean;
  hasUpcoming?: boolean;
  apiEnriched?: boolean;
  timestamps?: SeriesTimestampsPayload;
  dateAdded: string;
  lastModified?: string;
};

type RawSeriesPayload = Partial<SeriesPayload> & Record<string, unknown>;

const assertObject = (value: unknown): RawSeriesPayload => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ApiError(400, "BAD_REQUEST", "Series payload must be an object.");
  }

  return value as RawSeriesPayload;
};

const normalizeOptionalString = (value: unknown): string | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new ApiError(400, "BAD_REQUEST", "Series field must be a string.");
  }

  const normalized = value.trim();
  return normalized || undefined;
};

const normalizeRequiredString = (value: unknown, fieldName: string): string => {
  const normalized = normalizeOptionalString(value);

  if (!normalized) {
    throw new ApiError(400, "BAD_REQUEST", `${fieldName} is required.`);
  }

  return normalized;
};

const normalizeDateString = (value: unknown, fieldName: string): string | undefined => {
  const normalized = normalizeOptionalString(value);

  if (!normalized) {
    return undefined;
  }

  const parsed = new Date(normalized);

  if (Number.isNaN(parsed.getTime())) {
    throw new ApiError(400, "BAD_REQUEST", `${fieldName} must be a valid date.`);
  }

  return normalized;
};

const normalizeStringArray = (value: unknown, fieldName: string): string[] | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw new ApiError(400, "BAD_REQUEST", `${fieldName} must be an array.`);
  }

  const normalized = value
    .map((entry) => normalizeOptionalString(entry))
    .filter((entry): entry is string => Boolean(entry));

  return normalized.length ? normalized : [];
};

const normalizeRequiredStringArray = (value: unknown, fieldName: string): string[] => {
  const normalized = normalizeStringArray(value, fieldName);
  return normalized ?? [];
};

const normalizeOptionalBoolean = (
  value: unknown,
  fieldName: string,
  fallback?: boolean,
): boolean | undefined => {
  if (value === undefined || value === null) {
    return fallback;
  }

  if (typeof value !== "boolean") {
    throw new ApiError(400, "BAD_REQUEST", `${fieldName} must be a boolean.`);
  }

  return value;
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

  if (!Number.isInteger(value) || value < 0) {
    throw new ApiError(
      400,
      "BAD_REQUEST",
      `${fieldName} must be a positive whole number.`,
    );
  }

  return value;
};

const normalizeReadingOrder = (
  value: unknown,
  fallback: SeriesReadingOrder = "publication",
): SeriesReadingOrder => {
  const normalized = normalizeOptionalString(value);

  if (!normalized) {
    return fallback;
  }

  if (!SERIES_READING_ORDER_VALUES.includes(normalized as SeriesReadingOrder)) {
    throw new ApiError(400, "BAD_REQUEST", "Series reading order is invalid.");
  }

  return normalized as SeriesReadingOrder;
};

const normalizeStatus = (value: unknown): SeriesStatus | undefined => {
  const normalized = normalizeOptionalString(value);

  if (!normalized) {
    return undefined;
  }

  if (!SERIES_STATUS_VALUES.includes(normalized as SeriesStatus)) {
    throw new ApiError(400, "BAD_REQUEST", "Series status is invalid.");
  }

  return normalized as SeriesStatus;
};

const normalizeTimestamps = (value: unknown): SeriesTimestampsPayload | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  const rawValue = assertObject(value);
  const created = normalizeDateString(rawValue.created, "Series timestamp created");

  if (!created) {
    throw new ApiError(400, "BAD_REQUEST", "Series timestamp created is required.");
  }

  return {
    created,
    updated: normalizeDateString(rawValue.updated, "Series timestamp updated"),
    lastBookAdded: normalizeDateString(
      rawValue.lastBookAdded,
      "Series timestamp lastBookAdded",
    ),
  };
};

export const validateCreateSeriesPayload = (value: unknown): SeriesPayload => {
  const rawPayload = assertObject(value);
  const now = new Date().toISOString();
  const dateAdded = normalizeDateString(rawPayload.dateAdded, "Series dateAdded") || now;

  return {
    id: normalizeOptionalString(rawPayload.id) || `series-${uuidv4()}`,
    name: normalizeRequiredString(rawPayload.name, "Series name"),
    description: normalizeOptionalString(rawPayload.description),
    author: normalizeOptionalString(rawPayload.author),
    coverImage: normalizeOptionalString(rawPayload.coverImage),
    books: normalizeRequiredStringArray(rawPayload.books, "Series books"),
    totalBooks: normalizeOptionalNumber(rawPayload.totalBooks, "Series totalBooks"),
    readingOrder: normalizeReadingOrder(rawPayload.readingOrder),
    customOrder: normalizeStringArray(rawPayload.customOrder, "Series customOrder"),
    status: normalizeStatus(rawPayload.status),
    genre: normalizeStringArray(rawPayload.genre, "Series genre"),
    isTracked: normalizeOptionalBoolean(
      rawPayload.isTracked,
      "Series isTracked",
      false,
    ) as boolean,
    hasUpcoming: normalizeOptionalBoolean(
      rawPayload.hasUpcoming,
      "Series hasUpcoming",
    ),
    apiEnriched: normalizeOptionalBoolean(
      rawPayload.apiEnriched,
      "Series apiEnriched",
    ),
    timestamps: normalizeTimestamps(rawPayload.timestamps),
    dateAdded,
    lastModified:
      normalizeDateString(rawPayload.lastModified, "Series lastModified") || dateAdded,
  };
};

export const validateUpdateSeriesPayload = (
  value: unknown,
): Partial<SeriesPayload> => {
  const rawPayload = assertObject(value);
  const updates: Partial<SeriesPayload> = {};

  if ("id" in rawPayload) {
    updates.id = normalizeRequiredString(rawPayload.id, "Series id");
  }

  if ("name" in rawPayload) {
    updates.name = normalizeRequiredString(rawPayload.name, "Series name");
  }

  if ("description" in rawPayload) {
    updates.description = normalizeOptionalString(rawPayload.description);
  }

  if ("author" in rawPayload) {
    updates.author = normalizeOptionalString(rawPayload.author);
  }

  if ("coverImage" in rawPayload) {
    updates.coverImage = normalizeOptionalString(rawPayload.coverImage);
  }

  if ("books" in rawPayload) {
    updates.books = normalizeRequiredStringArray(rawPayload.books, "Series books");
  }

  if ("totalBooks" in rawPayload) {
    updates.totalBooks = normalizeOptionalNumber(rawPayload.totalBooks, "Series totalBooks");
  }

  if ("readingOrder" in rawPayload) {
    updates.readingOrder = normalizeReadingOrder(rawPayload.readingOrder);
  }

  if ("customOrder" in rawPayload) {
    updates.customOrder = normalizeStringArray(rawPayload.customOrder, "Series customOrder");
  }

  if ("status" in rawPayload) {
    updates.status = normalizeStatus(rawPayload.status);
  }

  if ("genre" in rawPayload) {
    updates.genre = normalizeStringArray(rawPayload.genre, "Series genre");
  }

  if ("isTracked" in rawPayload) {
    updates.isTracked = normalizeOptionalBoolean(
      rawPayload.isTracked,
      "Series isTracked",
    );
  }

  if ("hasUpcoming" in rawPayload) {
    updates.hasUpcoming = normalizeOptionalBoolean(
      rawPayload.hasUpcoming,
      "Series hasUpcoming",
    );
  }

  if ("apiEnriched" in rawPayload) {
    updates.apiEnriched = normalizeOptionalBoolean(
      rawPayload.apiEnriched,
      "Series apiEnriched",
    );
  }

  if ("timestamps" in rawPayload) {
    updates.timestamps = normalizeTimestamps(rawPayload.timestamps);
  }

  if ("dateAdded" in rawPayload) {
    updates.dateAdded = normalizeDateString(rawPayload.dateAdded, "Series dateAdded");
  }

  if ("lastModified" in rawPayload) {
    updates.lastModified = normalizeDateString(
      rawPayload.lastModified,
      "Series lastModified",
    );
  }

  return updates;
};
