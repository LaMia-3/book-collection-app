import { ApiError } from "./api-response.js";

export type UpcomingReleasePayload = {
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

type RawUpcomingReleasePayload = Partial<UpcomingReleasePayload> & Record<string, unknown>;

const assertObject = (value: unknown, message: string): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ApiError(400, "BAD_REQUEST", message);
  }

  return value as Record<string, unknown>;
};

const normalizeRequiredString = (value: unknown, fieldName: string): string => {
  if (typeof value !== "string") {
    throw new ApiError(400, "BAD_REQUEST", `${fieldName} must be a string.`);
  }

  const normalized = value.trim();

  if (!normalized) {
    throw new ApiError(400, "BAD_REQUEST", `${fieldName} is required.`);
  }

  return normalized;
};

const normalizeOptionalString = (
  value: unknown,
  fieldName: string,
): string | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new ApiError(400, "BAD_REQUEST", `${fieldName} must be a string.`);
  }

  const normalized = value.trim();
  return normalized || undefined;
};

const normalizeOptionalInteger = (
  value: unknown,
  fieldName: string,
): number | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "number" || Number.isNaN(value) || !Number.isInteger(value)) {
    throw new ApiError(400, "BAD_REQUEST", `${fieldName} must be a whole number.`);
  }

  return value;
};

const normalizeOptionalIsoDateString = (
  value: unknown,
  fieldName: string,
): string | undefined => {
  const normalized = normalizeOptionalString(value, fieldName);

  if (!normalized) {
    return undefined;
  }

  if (Number.isNaN(Date.parse(normalized))) {
    throw new ApiError(400, "BAD_REQUEST", `${fieldName} must be a valid date string.`);
  }

  return normalized;
};

const normalizeRequiredBoolean = (value: unknown, fieldName: string): boolean => {
  if (typeof value !== "boolean") {
    throw new ApiError(400, "BAD_REQUEST", `${fieldName} must be a boolean.`);
  }

  return value;
};

export const validateCreateUpcomingReleasePayload = (
  value: unknown,
): UpcomingReleasePayload => {
  const rawPayload = assertObject(
    value,
    "Upcoming release payload must be an object.",
  ) as RawUpcomingReleasePayload;

  return {
    id: normalizeRequiredString(rawPayload.id, "id"),
    title: normalizeRequiredString(rawPayload.title, "title"),
    seriesId: normalizeRequiredString(rawPayload.seriesId, "seriesId"),
    seriesName: normalizeRequiredString(rawPayload.seriesName, "seriesName"),
    volumeNumber: normalizeOptionalInteger(rawPayload.volumeNumber, "volumeNumber"),
    author: normalizeOptionalString(rawPayload.author, "author"),
    expectedReleaseDate: normalizeOptionalIsoDateString(
      rawPayload.expectedReleaseDate,
      "expectedReleaseDate",
    ),
    coverImageUrl: normalizeOptionalString(rawPayload.coverImageUrl, "coverImageUrl"),
    preOrderLink: normalizeOptionalString(rawPayload.preOrderLink, "preOrderLink"),
    synopsis: normalizeOptionalString(rawPayload.synopsis, "synopsis"),
    isUserContributed: normalizeRequiredBoolean(
      rawPayload.isUserContributed,
      "isUserContributed",
    ),
    amazonProductId: normalizeOptionalString(rawPayload.amazonProductId, "amazonProductId"),
  };
};

export const validateUpdateUpcomingReleasePayload = (
  value: unknown,
): Partial<UpcomingReleasePayload> => {
  const rawPayload = assertObject(
    value,
    "Upcoming release payload must be an object.",
  ) as RawUpcomingReleasePayload;

  return {
    id: rawPayload.id === undefined ? undefined : normalizeRequiredString(rawPayload.id, "id"),
    title:
      rawPayload.title === undefined
        ? undefined
        : normalizeRequiredString(rawPayload.title, "title"),
    seriesId:
      rawPayload.seriesId === undefined
        ? undefined
        : normalizeRequiredString(rawPayload.seriesId, "seriesId"),
    seriesName:
      rawPayload.seriesName === undefined
        ? undefined
        : normalizeRequiredString(rawPayload.seriesName, "seriesName"),
    volumeNumber: normalizeOptionalInteger(rawPayload.volumeNumber, "volumeNumber"),
    author: normalizeOptionalString(rawPayload.author, "author"),
    expectedReleaseDate: normalizeOptionalIsoDateString(
      rawPayload.expectedReleaseDate,
      "expectedReleaseDate",
    ),
    coverImageUrl: normalizeOptionalString(rawPayload.coverImageUrl, "coverImageUrl"),
    preOrderLink: normalizeOptionalString(rawPayload.preOrderLink, "preOrderLink"),
    synopsis: normalizeOptionalString(rawPayload.synopsis, "synopsis"),
    isUserContributed:
      rawPayload.isUserContributed === undefined
        ? undefined
        : normalizeRequiredBoolean(rawPayload.isUserContributed, "isUserContributed"),
    amazonProductId: normalizeOptionalString(rawPayload.amazonProductId, "amazonProductId"),
  };
};
