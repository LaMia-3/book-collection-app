import { ApiError } from "./api-response.js";

const DEFAULT_VIEW_VALUES = ["shelf", "list", "cover", "insights"] as const;
const DEFAULT_API_VALUES = ["google", "openlibrary"] as const;
const DEFAULT_STATUS_VALUES = ["want-to-read", "reading", "completed"] as const;

type DefaultView = (typeof DEFAULT_VIEW_VALUES)[number];
type DefaultApi = (typeof DEFAULT_API_VALUES)[number];
type DefaultStatus = (typeof DEFAULT_STATUS_VALUES)[number];

export type UserSettingsPayload = {
  preferredName?: string;
  birthday?: string;
  celebrateBirthday?: boolean;
  defaultView?: DefaultView;
  defaultApi?: DefaultApi;
  defaultStatus?: DefaultStatus;
  goals?: {
    enabled: boolean;
    monthlyTarget: number;
  };
  displayOptions?: {
    groupSpecialStatuses: boolean;
    disableHoverEffect: boolean;
    shelfOrder: string[];
  };
  notifications?: Record<string, boolean>;
};

type RawSettingsPayload = Partial<UserSettingsPayload> & Record<string, unknown>;

const assertObject = (value: unknown, message: string): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ApiError(400, "BAD_REQUEST", message);
  }

  return value as Record<string, unknown>;
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

const normalizeOptionalBoolean = (
  value: unknown,
  fieldName: string,
): boolean | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "boolean") {
    throw new ApiError(400, "BAD_REQUEST", `${fieldName} must be a boolean.`);
  }

  return value;
};

const normalizeDefaultView = (value: unknown): DefaultView | undefined => {
  const normalized = normalizeOptionalString(value, "defaultView");

  if (!normalized) {
    return undefined;
  }

  if (!DEFAULT_VIEW_VALUES.includes(normalized as DefaultView)) {
    throw new ApiError(400, "BAD_REQUEST", "defaultView is invalid.");
  }

  return normalized as DefaultView;
};

const normalizeDefaultApi = (value: unknown): DefaultApi | undefined => {
  const normalized = normalizeOptionalString(value, "defaultApi");

  if (!normalized) {
    return undefined;
  }

  if (!DEFAULT_API_VALUES.includes(normalized as DefaultApi)) {
    throw new ApiError(400, "BAD_REQUEST", "defaultApi is invalid.");
  }

  return normalized as DefaultApi;
};

const normalizeDefaultStatus = (value: unknown): DefaultStatus | undefined => {
  const normalized = normalizeOptionalString(value, "defaultStatus");

  if (!normalized) {
    return undefined;
  }

  if (!DEFAULT_STATUS_VALUES.includes(normalized as DefaultStatus)) {
    throw new ApiError(400, "BAD_REQUEST", "defaultStatus is invalid.");
  }

  return normalized as DefaultStatus;
};

const normalizeGoals = (
  value: unknown,
): UserSettingsPayload["goals"] | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  const rawValue = assertObject(value, "goals must be an object.");
  const enabled = normalizeOptionalBoolean(rawValue.enabled, "goals.enabled");
  const monthlyTarget = rawValue.monthlyTarget;

  if (monthlyTarget !== undefined && (typeof monthlyTarget !== "number" || Number.isNaN(monthlyTarget))) {
    throw new ApiError(400, "BAD_REQUEST", "goals.monthlyTarget must be a number.");
  }

  if (typeof monthlyTarget === "number" && (!Number.isInteger(monthlyTarget) || monthlyTarget < 0)) {
    throw new ApiError(
      400,
      "BAD_REQUEST",
      "goals.monthlyTarget must be a positive whole number.",
    );
  }

  return {
    enabled: enabled ?? false,
    monthlyTarget: typeof monthlyTarget === "number" ? monthlyTarget : 4,
  };
};

const normalizeDisplayOptions = (
  value: unknown,
): UserSettingsPayload["displayOptions"] | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  const rawValue = assertObject(value, "displayOptions must be an object.");
  const shelfOrder = rawValue.shelfOrder;

  if (shelfOrder !== undefined && !Array.isArray(shelfOrder)) {
    throw new ApiError(400, "BAD_REQUEST", "displayOptions.shelfOrder must be an array.");
  }

  const normalizedShelfOrder = Array.isArray(shelfOrder)
    ? shelfOrder
        .map((entry) => normalizeOptionalString(entry, "displayOptions.shelfOrder item"))
        .filter((entry): entry is string => Boolean(entry))
    : ['reading', 'want-to-read', 'completed', 'on-hold', 'dnf'];

  return {
    groupSpecialStatuses:
      normalizeOptionalBoolean(
        rawValue.groupSpecialStatuses,
        "displayOptions.groupSpecialStatuses",
      ) ?? false,
    disableHoverEffect:
      normalizeOptionalBoolean(
        rawValue.disableHoverEffect,
        "displayOptions.disableHoverEffect",
      ) ?? false,
    shelfOrder: normalizedShelfOrder,
  };
};

const normalizeNotifications = (
  value: unknown,
): Record<string, boolean> | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  const rawValue = assertObject(value, "notifications must be an object.");
  const normalizedNotifications: Record<string, boolean> = {};

  Object.entries(rawValue).forEach(([key, entryValue]) => {
    if (typeof entryValue !== "boolean") {
      throw new ApiError(400, "BAD_REQUEST", `notifications.${key} must be a boolean.`);
    }

    normalizedNotifications[key] = entryValue;
  });

  return normalizedNotifications;
};

export const validateUpdateUserSettingsPayload = (
  value: unknown,
): UserSettingsPayload => {
  const rawPayload = assertObject(value, "User settings payload must be an object.") as RawSettingsPayload;

  return {
    preferredName: normalizeOptionalString(rawPayload.preferredName, "preferredName"),
    birthday: normalizeOptionalString(rawPayload.birthday, "birthday"),
    celebrateBirthday: normalizeOptionalBoolean(
      rawPayload.celebrateBirthday,
      "celebrateBirthday",
    ),
    defaultView: normalizeDefaultView(rawPayload.defaultView),
    defaultApi: normalizeDefaultApi(rawPayload.defaultApi),
    defaultStatus: normalizeDefaultStatus(rawPayload.defaultStatus),
    goals: normalizeGoals(rawPayload.goals),
    displayOptions: normalizeDisplayOptions(rawPayload.displayOptions),
    notifications: normalizeNotifications(rawPayload.notifications),
  };
};
