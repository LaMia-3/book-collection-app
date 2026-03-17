import { ApiError } from "./api-response.js";

const NOTIFICATION_TYPE_VALUES = ["release", "system", "update", "alert"] as const;

type NotificationType = (typeof NOTIFICATION_TYPE_VALUES)[number];

export type NotificationPayload = {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  createdAt: string;
  isRead: boolean;
  isDismissed: boolean;
  seriesId?: string;
  bookId?: string;
  actionUrl?: string;
};

type RawNotificationPayload = Partial<NotificationPayload> & Record<string, unknown>;

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

const normalizeRequiredBoolean = (value: unknown, fieldName: string): boolean => {
  if (typeof value !== "boolean") {
    throw new ApiError(400, "BAD_REQUEST", `${fieldName} must be a boolean.`);
  }

  return value;
};

const normalizeNotificationType = (value: unknown): NotificationType => {
  const normalized = normalizeRequiredString(value, "type");

  if (!NOTIFICATION_TYPE_VALUES.includes(normalized as NotificationType)) {
    throw new ApiError(400, "BAD_REQUEST", "type is invalid.");
  }

  return normalized as NotificationType;
};

const normalizeIsoDateString = (value: unknown, fieldName: string): string => {
  const normalized = normalizeRequiredString(value, fieldName);

  if (Number.isNaN(Date.parse(normalized))) {
    throw new ApiError(400, "BAD_REQUEST", `${fieldName} must be a valid date string.`);
  }

  return normalized;
};

export const validateCreateNotificationPayload = (
  value: unknown,
): NotificationPayload => {
  const rawPayload = assertObject(
    value,
    "Notification payload must be an object.",
  ) as RawNotificationPayload;

  return {
    id: normalizeRequiredString(rawPayload.id, "id"),
    title: normalizeRequiredString(rawPayload.title, "title"),
    message: normalizeRequiredString(rawPayload.message, "message"),
    type: normalizeNotificationType(rawPayload.type),
    createdAt: normalizeIsoDateString(rawPayload.createdAt, "createdAt"),
    isRead: normalizeRequiredBoolean(rawPayload.isRead, "isRead"),
    isDismissed: normalizeRequiredBoolean(rawPayload.isDismissed, "isDismissed"),
    seriesId: normalizeOptionalString(rawPayload.seriesId, "seriesId"),
    bookId: normalizeOptionalString(rawPayload.bookId, "bookId"),
    actionUrl: normalizeOptionalString(rawPayload.actionUrl, "actionUrl"),
  };
};

export const validateUpdateNotificationPayload = (
  value: unknown,
): Partial<NotificationPayload> => {
  const rawPayload = assertObject(
    value,
    "Notification payload must be an object.",
  ) as RawNotificationPayload;

  return {
    id: rawPayload.id === undefined ? undefined : normalizeRequiredString(rawPayload.id, "id"),
    title:
      rawPayload.title === undefined
        ? undefined
        : normalizeRequiredString(rawPayload.title, "title"),
    message:
      rawPayload.message === undefined
        ? undefined
        : normalizeRequiredString(rawPayload.message, "message"),
    type: rawPayload.type === undefined ? undefined : normalizeNotificationType(rawPayload.type),
    createdAt:
      rawPayload.createdAt === undefined
        ? undefined
        : normalizeIsoDateString(rawPayload.createdAt, "createdAt"),
    isRead:
      rawPayload.isRead === undefined
        ? undefined
        : normalizeRequiredBoolean(rawPayload.isRead, "isRead"),
    isDismissed:
      rawPayload.isDismissed === undefined
        ? undefined
        : normalizeRequiredBoolean(rawPayload.isDismissed, "isDismissed"),
    seriesId: normalizeOptionalString(rawPayload.seriesId, "seriesId"),
    bookId: normalizeOptionalString(rawPayload.bookId, "bookId"),
    actionUrl: normalizeOptionalString(rawPayload.actionUrl, "actionUrl"),
  };
};
