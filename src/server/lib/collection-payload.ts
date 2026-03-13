import { v4 as uuidv4 } from "uuid";

import { ApiError } from "./api-response.js";

export type CollectionPayload = {
  id: string;
  name: string;
  description?: string;
  bookIds: string[];
  color?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
};

type RawCollectionPayload = Partial<CollectionPayload> & Record<string, unknown>;

const assertObject = (value: unknown): RawCollectionPayload => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ApiError(400, "BAD_REQUEST", "Collection payload must be an object.");
  }

  return value as RawCollectionPayload;
};

const normalizeOptionalString = (value: unknown): string | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new ApiError(400, "BAD_REQUEST", "Collection field must be a string.");
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

const normalizeStringArray = (value: unknown, fieldName: string): string[] => {
  if (value === undefined || value === null) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new ApiError(400, "BAD_REQUEST", `${fieldName} must be an array.`);
  }

  return value
    .map((entry) => normalizeOptionalString(entry))
    .filter((entry): entry is string => Boolean(entry));
};

const normalizeDateString = (
  value: unknown,
  fieldName: string,
  fallback?: string,
): string => {
  const normalized = normalizeOptionalString(value) || fallback;

  if (!normalized) {
    throw new ApiError(400, "BAD_REQUEST", `${fieldName} is required.`);
  }

  const parsedDate = new Date(normalized);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new ApiError(400, "BAD_REQUEST", `${fieldName} must be a valid date.`);
  }

  return normalized;
};

export const validateCreateCollectionPayload = (value: unknown): CollectionPayload => {
  const rawPayload = assertObject(value);
  const now = new Date().toISOString();

  return {
    id: normalizeOptionalString(rawPayload.id) || `collection-${uuidv4()}`,
    name: normalizeRequiredString(rawPayload.name, "Collection name"),
    description: normalizeOptionalString(rawPayload.description),
    bookIds: normalizeStringArray(rawPayload.bookIds, "Collection bookIds"),
    color: normalizeOptionalString(rawPayload.color),
    imageUrl: normalizeOptionalString(rawPayload.imageUrl),
    createdAt: normalizeDateString(rawPayload.createdAt, "Collection createdAt", now),
    updatedAt: normalizeDateString(rawPayload.updatedAt, "Collection updatedAt", now),
  };
};

export const validateUpdateCollectionPayload = (
  value: unknown,
): Partial<CollectionPayload> => {
  const rawPayload = assertObject(value);
  const updates: Partial<CollectionPayload> = {};

  if ("id" in rawPayload) {
    updates.id = normalizeRequiredString(rawPayload.id, "Collection id");
  }

  if ("name" in rawPayload) {
    updates.name = normalizeRequiredString(rawPayload.name, "Collection name");
  }

  if ("description" in rawPayload) {
    updates.description = normalizeOptionalString(rawPayload.description);
  }

  if ("bookIds" in rawPayload) {
    updates.bookIds = normalizeStringArray(rawPayload.bookIds, "Collection bookIds");
  }

  if ("color" in rawPayload) {
    updates.color = normalizeOptionalString(rawPayload.color);
  }

  if ("imageUrl" in rawPayload) {
    updates.imageUrl = normalizeOptionalString(rawPayload.imageUrl);
  }

  if ("createdAt" in rawPayload) {
    updates.createdAt = normalizeDateString(rawPayload.createdAt, "Collection createdAt");
  }

  if ("updatedAt" in rawPayload) {
    updates.updatedAt = normalizeDateString(rawPayload.updatedAt, "Collection updatedAt");
  }

  return updates;
};
