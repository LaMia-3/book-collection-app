import { VercelRequest, VercelResponse } from "@vercel/node";
import { randomBytes } from "node:crypto";
import { MongoServerError } from "mongodb";

import { ApiError, methodNotAllowed, sendError, sendJson } from "../../src/server/lib/api-response.js";
import {
  createAdminAuditLog,
  listAdminAuditLogs,
  toAdminAuditLogEntry,
} from "../../src/server/models/admin-audit-log.js";
import {
  findSystemAnnouncementById,
  insertSystemAnnouncement,
  listActiveSystemAnnouncements,
  listAllSystemAnnouncements,
  SystemAnnouncementEnvironment,
  SystemAnnouncementInput,
  SystemAnnouncementKind,
  SystemAnnouncementSeverity,
  toPublicSystemAnnouncement,
  updateSystemAnnouncementById,
  deleteSystemAnnouncementById,
} from "../../src/server/models/system-announcement.js";
import { ensureBootstrapAdminUser } from "../../src/server/lib/admin-bootstrap.js";
import { signAuthToken } from "../../src/server/lib/auth.js";
import { sendPasswordResetEmail } from "../../src/server/lib/email.js";
import {
  CredentialValidationError,
  hashPassword,
  validateEmail,
  validateLoginCredentials,
  validatePassword,
  validateRegisterCredentials,
  verifyPassword,
} from "../../src/server/lib/password.js";
import {
  ForbiddenError,
  UnauthorizedError,
  requireAdminUser,
  requireAuthenticatedUser,
} from "../../src/server/middleware/auth.js";
import {
  countAdmins,
  findUserByEmail,
  findUserById,
  deleteUserById,
  insertUser,
  listUsers,
  toPublicUser,
  updateUserEmailById,
  updateUserLastLoginById,
  updateUserPasswordById,
  updateUserPreferredNameById,
  updateUserRoleById,
} from "../../src/server/models/user.js";
import { getBooksCollection } from "../../src/server/models/book.js";
import { getSeriesCollection } from "../../src/server/models/series.js";
import { getCollectionsCollection } from "../../src/server/models/collection.js";
import { getUpcomingReleasesCollection } from "../../src/server/models/upcoming-release.js";
import { getNotificationsCollection } from "../../src/server/models/notification.js";
import { getUserSettingsCollection } from "../../src/server/models/user-settings.js";
import {
  dismissAnnouncement,
  getAnnouncementStateCounts,
  getUserAnnouncementStates,
  markAnnouncementSeen,
} from "../../src/server/models/user-announcement-state.js";
import {
  consumePasswordResetOtp,
  createPasswordResetOtp,
  invalidatePasswordResetOtpsForUser,
  verifyPasswordResetOtp,
} from "../../src/server/models/password-reset-otp.js";

type AuthRequestBody = {
  announcementId?: string;
  announcementBody?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  currentPassword?: string;
  email?: string;
  endsAt?: string;
  environment?: "all" | "preview" | "production";
  isActive?: boolean;
  kind?: "release" | "maintenance" | "warning" | "feature";
  maxAppVersion?: string;
  minAppVersion?: string;
  newPassword?: string;
  otp?: string;
  password?: string;
  preferredName?: string;
  role?: "user" | "admin";
  severity?: "info" | "success" | "warning" | "critical";
  startsAt?: string;
  title?: string;
  userId?: string;
};

type DeletedAccountSummary = {
  books: number;
  series: number;
  collections: number;
  upcomingReleases: number;
  notifications: number;
  userSettings: number;
};

const createTemporaryPassword = (): string => {
  return randomBytes(12).toString("base64url");
};

const resolveAnnouncementEnvironment = (): "preview" | "production" => {
  return process.env.VERCEL_ENV === "production" ? "production" : "preview";
};

const resolveAppVersion = (request: VercelRequest): string => {
  const header = request.headers["x-app-version"];
  const appVersion = Array.isArray(header) ? header[0] : header;

  return appVersion?.trim() || process.env.APP_VERSION?.trim() || "2.0.0";
};

const SYSTEM_ANNOUNCEMENT_KINDS: SystemAnnouncementKind[] = [
  "release",
  "maintenance",
  "warning",
  "feature",
];

const SYSTEM_ANNOUNCEMENT_SEVERITIES: SystemAnnouncementSeverity[] = [
  "info",
  "success",
  "warning",
  "critical",
];

const SYSTEM_ANNOUNCEMENT_ENVIRONMENTS: SystemAnnouncementEnvironment[] = [
  "all",
  "preview",
  "production",
];

const getRequestBody = (request: VercelRequest): AuthRequestBody => {
  if (!request.body || typeof request.body !== "object") {
    return {};
  }

  return request.body as AuthRequestBody;
};

const resolveAction = (request: VercelRequest): string => {
  const value = request.query.action;
  const action = Array.isArray(value) ? value[0] : value;

  if (!action) {
    throw new ApiError(404, "NOT_FOUND", "Auth route not found.");
  }

  return action;
};

const getQueryValue = (
  request: VercelRequest,
  key: string,
): string => {
  const value = request.query[key];

  if (Array.isArray(value)) {
    return value[0] || "";
  }

  return typeof value === "string" ? value : "";
};

const getResetOtp = (value: string | undefined): string => {
  return (value || "").trim();
};

const normalizeOptionalString = (value: string | undefined): string | undefined => {
  const normalized = value?.trim();
  return normalized || undefined;
};

const parseOptionalDate = (value: string | undefined, fieldName: string): Date | undefined => {
  const normalized = normalizeOptionalString(value);

  if (!normalized) {
    return undefined;
  }

  const parsedDate = new Date(normalized);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new ApiError(400, "BAD_REQUEST", `${fieldName} must be a valid date.`);
  }

  return parsedDate;
};

const validateAnnouncementEnum = <T extends string>(
  value: string | undefined,
  allowedValues: T[],
  fieldName: string,
): T => {
  const normalized = normalizeOptionalString(value);

  if (!normalized || !allowedValues.includes(normalized as T)) {
    throw new ApiError(
      400,
      "BAD_REQUEST",
      `${fieldName} must be one of: ${allowedValues.join(", ")}.`,
    );
  }

  return normalized as T;
};

const validateOptionalUrl = (value: string | undefined): string | undefined => {
  const normalized = normalizeOptionalString(value);

  if (!normalized) {
    return undefined;
  }

  try {
    const parsed = new URL(normalized);
    return parsed.toString();
  } catch {
    throw new ApiError(400, "BAD_REQUEST", "ctaUrl must be a valid URL.");
  }
};

const normalizeSystemAnnouncementInput = (
  body: AuthRequestBody,
  mode: "create" | "update",
): Partial<SystemAnnouncementInput> => {
  const title = normalizeOptionalString(body.title);
  const announcementBody = normalizeOptionalString(body.announcementBody);
  const startsAt = parseOptionalDate(body.startsAt, "startsAt");
  const endsAt = parseOptionalDate(body.endsAt, "endsAt");
  const ctaLabel = normalizeOptionalString(body.ctaLabel);
  const ctaUrl = validateOptionalUrl(body.ctaUrl);
  const minAppVersion = normalizeOptionalString(body.minAppVersion);
  const maxAppVersion = normalizeOptionalString(body.maxAppVersion);

  if (startsAt && endsAt && startsAt > endsAt) {
    throw new ApiError(
      400,
      "BAD_REQUEST",
      "endsAt must be after startsAt.",
    );
  }

  if (mode === "create") {
    if (!title) {
      throw new ApiError(400, "BAD_REQUEST", "title is required.");
    }

    if (!announcementBody) {
      throw new ApiError(400, "BAD_REQUEST", "announcementBody is required.");
    }
  }

  const nextPayload: Partial<SystemAnnouncementInput> = {};

  if (title !== undefined) {
    nextPayload.title = title;
  }

  if (announcementBody !== undefined) {
    nextPayload.body = announcementBody;
  }

  if (body.kind !== undefined) {
    nextPayload.kind = validateAnnouncementEnum(
      body.kind,
      SYSTEM_ANNOUNCEMENT_KINDS,
      "kind",
    );
  }

  if (body.severity !== undefined) {
    nextPayload.severity = validateAnnouncementEnum(
      body.severity,
      SYSTEM_ANNOUNCEMENT_SEVERITIES,
      "severity",
    );
  }

  if (body.environment !== undefined) {
    nextPayload.environment = validateAnnouncementEnum(
      body.environment,
      SYSTEM_ANNOUNCEMENT_ENVIRONMENTS,
      "environment",
    );
  }

  if (body.isActive !== undefined) {
    nextPayload.isActive = body.isActive;
  }

  if (body.startsAt !== undefined) {
    nextPayload.startsAt = startsAt;
  }

  if (body.endsAt !== undefined) {
    nextPayload.endsAt = endsAt;
  }

  if (body.minAppVersion !== undefined) {
    nextPayload.minAppVersion = minAppVersion;
  }

  if (body.maxAppVersion !== undefined) {
    nextPayload.maxAppVersion = maxAppVersion;
  }

  if (body.ctaLabel !== undefined) {
    nextPayload.ctaLabel = ctaLabel;
  }

  if (body.ctaUrl !== undefined) {
    nextPayload.ctaUrl = ctaUrl;
  }

  return nextPayload;
};

const deleteOwnedUserData = async (
  userId: string,
): Promise<DeletedAccountSummary> => {
  const [
    booksCollection,
    seriesCollection,
    collectionsCollection,
    upcomingReleasesCollection,
    notificationsCollection,
    userSettingsCollection,
  ] = await Promise.all([
    getBooksCollection(),
    getSeriesCollection(),
    getCollectionsCollection(),
    getUpcomingReleasesCollection(),
    getNotificationsCollection(),
    getUserSettingsCollection(),
  ]);

  const [
    booksResult,
    seriesResult,
    collectionsResult,
    upcomingReleasesResult,
    notificationsResult,
    userSettingsResult,
  ] = await Promise.all([
    booksCollection.deleteMany({ userId }),
    seriesCollection.deleteMany({ userId }),
    collectionsCollection.deleteMany({ userId }),
    upcomingReleasesCollection.deleteMany({ userId }),
    notificationsCollection.deleteMany({ userId }),
    userSettingsCollection.deleteMany({ userId }),
  ]);

  const userDeleted = await deleteUserById(userId);

  if (!userDeleted) {
    throw new ApiError(500, "INTERNAL_SERVER_ERROR", "Failed to delete account.");
  }

  return {
    books: booksResult.deletedCount,
    series: seriesResult.deletedCount,
    collections: collectionsResult.deletedCount,
    upcomingReleases: upcomingReleasesResult.deletedCount,
    notifications: notificationsResult.deletedCount,
    userSettings: userSettingsResult.deletedCount,
  };
};

const handleRegister = async (
  request: VercelRequest,
  response: VercelResponse,
): Promise<VercelResponse> => {
  if (request.method !== "POST") {
    return methodNotAllowed(response, ["POST"]);
  }

  const body = getRequestBody(request);
  const credentials = validateRegisterCredentials({
    email: body.email || "",
    password: body.password || "",
    preferredName: body.preferredName,
  });

  const existingUser = await findUserByEmail(credentials.email);

  if (existingUser) {
    throw new ApiError(409, "CONFLICT", "User already exists.");
  }

  const passwordHash = await hashPassword(credentials.password);
  const user = await insertUser({
    email: credentials.email,
    passwordHash,
    preferredName: credentials.preferredName,
  });
  const token = signAuthToken({
    sub: user._id!.toString(),
    email: user.email,
  });

  return sendJson(response, 201, {
    token,
    user: toPublicUser(user),
  });
};

const handleLogin = async (
  request: VercelRequest,
  response: VercelResponse,
): Promise<VercelResponse> => {
  if (request.method !== "POST") {
    return methodNotAllowed(response, ["POST"]);
  }

  const body = getRequestBody(request);
  const credentials = validateLoginCredentials({
    email: body.email || "",
    password: body.password || "",
  });
  const user = await findUserByEmail(credentials.email);

  if (!user) {
    throw new ApiError(401, "UNAUTHORIZED", "Invalid credentials.");
  }

  const isValidPassword = await verifyPassword(
    credentials.password,
    user.passwordHash,
  );

  if (!isValidPassword) {
    throw new ApiError(401, "UNAUTHORIZED", "Invalid credentials.");
  }

  const loggedInUser = await updateUserLastLoginById(user._id!.toString());

  if (!loggedInUser?._id) {
    throw new ApiError(500, "INTERNAL_SERVER_ERROR", "Failed to update login state.");
  }

  const token = signAuthToken({
    sub: loggedInUser._id.toString(),
    email: loggedInUser.email,
  });

  return sendJson(response, 200, {
    token,
    user: toPublicUser(loggedInUser),
  });
};

const handleMe = async (
  request: VercelRequest,
  response: VercelResponse,
): Promise<VercelResponse> => {
  if (request.method !== "GET") {
    return methodNotAllowed(response, ["GET"]);
  }

  const authUser = await requireAuthenticatedUser(request);
  const user = await findUserById(authUser.sub);

  if (!user) {
    throw new ApiError(404, "NOT_FOUND", "User not found.");
  }

  return sendJson(response, 200, toPublicUser(user));
};

const handleDeleteAccount = async (
  request: VercelRequest,
  response: VercelResponse,
): Promise<VercelResponse> => {
  if (request.method !== "DELETE") {
    return methodNotAllowed(response, ["DELETE"]);
  }

  const authUser = await requireAuthenticatedUser(request);
  const user = await findUserById(authUser.sub);

  if (!user) {
    throw new ApiError(404, "NOT_FOUND", "User not found.");
  }

  const summary = await deleteOwnedUserData(authUser.sub);

  return sendJson(response, 200, { success: true, summary });
};

const handleAdminUsers = async (
  request: VercelRequest,
  response: VercelResponse,
): Promise<VercelResponse> => {
  if (request.method !== "GET") {
    return methodNotAllowed(response, ["GET"]);
  }

  await requireAdminUser(request);
  const users = await listUsers();

  return sendJson(
    response,
    200,
    users.map((user) => toPublicUser(user)),
  );
};

const handleAdminAuditLogs = async (
  request: VercelRequest,
  response: VercelResponse,
): Promise<VercelResponse> => {
  if (request.method !== "GET") {
    return methodNotAllowed(response, ["GET"]);
  }

  await requireAdminUser(request);
  const logs = await listAdminAuditLogs(100);

  return sendJson(
    response,
    200,
    logs.map((log) => toAdminAuditLogEntry(log)),
  );
};

const handleAdminSystemAnnouncements = async (
  request: VercelRequest,
  response: VercelResponse,
): Promise<VercelResponse> => {
  const adminUser = await requireAdminUser(request);

  if (request.method === "GET") {
    const announcements = await listAllSystemAnnouncements();
    const counts = await getAnnouncementStateCounts(
      announcements.map((announcement) => announcement._id!.toString()),
    );

    return sendJson(
      response,
      200,
      announcements.map((announcement) => {
        const announcementId = announcement._id!.toString();
        const stateCounts = counts[announcementId] || {
          seenCount: 0,
          dismissedCount: 0,
        };

        return {
          ...toPublicSystemAnnouncement(announcement),
          seenCount: stateCounts.seenCount,
          dismissedCount: stateCounts.dismissedCount,
        };
      }),
    );
  }

  if (request.method === "POST") {
    const body = getRequestBody(request);
    const payload = normalizeSystemAnnouncementInput(body, "create");

    const announcement = await insertSystemAnnouncement({
      title: payload.title!,
      body: payload.body!,
      kind: payload.kind || "feature",
      severity: payload.severity || "info",
      isActive: payload.isActive ?? true,
      startsAt: payload.startsAt,
      endsAt: payload.endsAt,
      minAppVersion: payload.minAppVersion,
      maxAppVersion: payload.maxAppVersion,
      environment: payload.environment || "all",
      ctaLabel: payload.ctaLabel,
      ctaUrl: payload.ctaUrl,
    });

    await createAdminAuditLog({
      actorUserId: adminUser.sub,
      actorEmail: adminUser.email,
      action: "admin.announcement.created",
      targetUserId: announcement._id!.toString(),
      targetUserEmail: announcement.title,
      details: {
        environment: announcement.environment,
        isActive: announcement.isActive,
        severity: announcement.severity,
      },
    });

    return sendJson(response, 201, toPublicSystemAnnouncement(announcement));
  }

  return methodNotAllowed(response, ["GET", "POST"]);
};

const handleAdminSystemAnnouncementUpdate = async (
  request: VercelRequest,
  response: VercelResponse,
): Promise<VercelResponse> => {
  if (request.method !== "POST") {
    return methodNotAllowed(response, ["POST"]);
  }

  const adminUser = await requireAdminUser(request);
  const body = getRequestBody(request);
  const announcementId = (body.announcementId || "").trim();

  if (!announcementId) {
    throw new ApiError(400, "BAD_REQUEST", "Announcement ID is required.");
  }

  const existingAnnouncement = await findSystemAnnouncementById(announcementId);

  if (!existingAnnouncement) {
    throw new ApiError(404, "NOT_FOUND", "Announcement not found.");
  }

  const payload = normalizeSystemAnnouncementInput(body, "update");

  if (Object.keys(payload).length === 0) {
    throw new ApiError(400, "BAD_REQUEST", "No announcement changes were provided.");
  }

  const updatedAnnouncement = await updateSystemAnnouncementById(
    announcementId,
    payload,
  );

  if (!updatedAnnouncement) {
    throw new ApiError(
      500,
      "INTERNAL_SERVER_ERROR",
      "Failed to update announcement.",
    );
  }

  const becameActive =
    existingAnnouncement.isActive === false && updatedAnnouncement.isActive === true;
  const becameInactive =
    existingAnnouncement.isActive === true && updatedAnnouncement.isActive === false;

  await createAdminAuditLog({
    actorUserId: adminUser.sub,
    actorEmail: adminUser.email,
    action: becameActive
      ? "admin.announcement.activated"
      : becameInactive
        ? "admin.announcement.deactivated"
        : "admin.announcement.updated",
    targetUserId: updatedAnnouncement._id!.toString(),
    targetUserEmail: updatedAnnouncement.title,
    details: {
      previousIsActive: existingAnnouncement.isActive,
      nextIsActive: updatedAnnouncement.isActive,
      environment: updatedAnnouncement.environment,
      severity: updatedAnnouncement.severity,
    },
  });

  return sendJson(response, 200, toPublicSystemAnnouncement(updatedAnnouncement));
};

const handleAdminSystemAnnouncementDelete = async (
  request: VercelRequest,
  response: VercelResponse,
): Promise<VercelResponse> => {
  if (request.method !== "POST") {
    return methodNotAllowed(response, ["POST"]);
  }

  const adminUser = await requireAdminUser(request);
  const body = getRequestBody(request);
  const announcementId = (body.announcementId || "").trim();

  if (!announcementId) {
    throw new ApiError(400, "BAD_REQUEST", "Announcement ID is required.");
  }

  const existingAnnouncement = await findSystemAnnouncementById(announcementId);

  if (!existingAnnouncement) {
    throw new ApiError(404, "NOT_FOUND", "Announcement not found.");
  }

  const deleted = await deleteSystemAnnouncementById(announcementId);

  if (!deleted) {
    throw new ApiError(
      500,
      "INTERNAL_SERVER_ERROR",
      "Failed to delete announcement.",
    );
  }

  await createAdminAuditLog({
    actorUserId: adminUser.sub,
    actorEmail: adminUser.email,
    action: "admin.announcement.deleted",
    targetUserId: announcementId,
    targetUserEmail: existingAnnouncement.title,
    details: {
      environment: existingAnnouncement.environment,
      isActive: existingAnnouncement.isActive,
      severity: existingAnnouncement.severity,
    },
  });

  return sendJson(response, 200, { success: true });
};

const handleSystemAnnouncements = async (
  request: VercelRequest,
  response: VercelResponse,
): Promise<VercelResponse> => {
  if (request.method !== "GET") {
    return methodNotAllowed(response, ["GET"]);
  }

  const authUser = await requireAuthenticatedUser(request);
  const appVersion = resolveAppVersion(request);
  const environment = resolveAnnouncementEnvironment();
  const announcements = await listActiveSystemAnnouncements({
    appVersion,
    environment,
  });
  const states = await getUserAnnouncementStates(
    authUser.sub,
    announcements.map((announcement) => announcement._id!.toString()),
  );
  const statesByAnnouncementId = new Map(
    states.map((state) => [state.announcementId, state]),
  );

  return sendJson(
    response,
    200,
    announcements
      .filter((announcement) => {
        const state = statesByAnnouncementId.get(announcement._id!.toString());
        return !state?.dismissedAt;
      })
      .map((announcement) => {
        const state = statesByAnnouncementId.get(announcement._id!.toString());

        return {
          ...toPublicSystemAnnouncement(announcement),
          isSeen: Boolean(state?.seenAt),
          dismissedAt: state?.dismissedAt?.toISOString(),
        };
      }),
  );
};

const handleSystemAnnouncementSeen = async (
  request: VercelRequest,
  response: VercelResponse,
): Promise<VercelResponse> => {
  if (request.method !== "POST") {
    return methodNotAllowed(response, ["POST"]);
  }

  const authUser = await requireAuthenticatedUser(request);
  const body = getRequestBody(request);
  const announcementId = (body.announcementId || "").trim();

  if (!announcementId) {
    throw new ApiError(400, "BAD_REQUEST", "Announcement ID is required.");
  }

  const announcement = await findSystemAnnouncementById(announcementId);

  if (!announcement) {
    throw new ApiError(404, "NOT_FOUND", "Announcement not found.");
  }

  await markAnnouncementSeen(authUser.sub, announcementId);

  return sendJson(response, 200, { success: true });
};

const handleSystemAnnouncementDismiss = async (
  request: VercelRequest,
  response: VercelResponse,
): Promise<VercelResponse> => {
  if (request.method !== "POST") {
    return methodNotAllowed(response, ["POST"]);
  }

  const authUser = await requireAuthenticatedUser(request);
  const body = getRequestBody(request);
  const announcementId = (body.announcementId || "").trim();

  if (!announcementId) {
    throw new ApiError(400, "BAD_REQUEST", "Announcement ID is required.");
  }

  const announcement = await findSystemAnnouncementById(announcementId);

  if (!announcement) {
    throw new ApiError(404, "NOT_FOUND", "Announcement not found.");
  }

  await dismissAnnouncement(authUser.sub, announcementId);

  return sendJson(response, 200, { success: true });
};

const handleAdminUserDetail = async (
  request: VercelRequest,
  response: VercelResponse,
): Promise<VercelResponse> => {
  if (request.method !== "GET") {
    return methodNotAllowed(response, ["GET"]);
  }

  await requireAdminUser(request);
  const userId = getQueryValue(request, "userId").trim();

  if (!userId) {
    throw new ApiError(400, "BAD_REQUEST", "User ID is required.");
  }

  const user = await findUserById(userId);

  if (!user) {
    throw new ApiError(404, "NOT_FOUND", "User not found.");
  }

  const [
    booksCollection,
    seriesCollection,
    collectionsCollection,
    upcomingReleasesCollection,
    notificationsCollection,
    userSettingsCollection,
  ] = await Promise.all([
    getBooksCollection(),
    getSeriesCollection(),
    getCollectionsCollection(),
    getUpcomingReleasesCollection(),
    getNotificationsCollection(),
    getUserSettingsCollection(),
  ]);

  const [
    books,
    series,
    collections,
    upcomingReleases,
    notifications,
    hasUserSettings,
  ] = await Promise.all([
    booksCollection.countDocuments({ userId }),
    seriesCollection.countDocuments({ userId }),
    collectionsCollection.countDocuments({ userId }),
    upcomingReleasesCollection.countDocuments({ userId }),
    notificationsCollection.countDocuments({ userId }),
    userSettingsCollection.countDocuments({ userId }),
  ]);

  return sendJson(response, 200, {
    user: toPublicUser(user),
    counts: {
      books,
      series,
      collections,
      upcomingReleases,
      notifications,
    },
    hasUserSettings: hasUserSettings > 0,
  });
};

const handleAdminDeleteAccount = async (
  request: VercelRequest,
  response: VercelResponse,
): Promise<VercelResponse> => {
  if (request.method !== "POST") {
    return methodNotAllowed(response, ["POST"]);
  }

  const adminUser = await requireAdminUser(request);
  const body = getRequestBody(request);
  const userId = (body.userId || "").trim();

  if (!userId) {
    throw new ApiError(400, "BAD_REQUEST", "User ID is required.");
  }

  if (userId === adminUser.sub) {
    throw new ApiError(
      403,
      "FORBIDDEN",
      "Admins cannot delete their own account.",
    );
  }

  const user = await findUserById(userId);

  if (!user) {
    throw new ApiError(404, "NOT_FOUND", "User not found.");
  }

  const summary = await deleteOwnedUserData(userId);

  await createAdminAuditLog({
    actorUserId: adminUser.sub,
    actorEmail: adminUser.email,
    action: "admin.user.deleted",
    targetUserId: userId,
    targetUserEmail: user.email,
    details: {
      summary,
      role: user.role || "user",
    },
  });

  return sendJson(response, 200, {
    success: true,
    deletedUser: {
      id: user._id!.toString(),
      email: user.email,
      preferredName: user.preferredName,
      role: user.role || "user",
    },
    summary,
  });
};

const handleAdminSetRole = async (
  request: VercelRequest,
  response: VercelResponse,
): Promise<VercelResponse> => {
  if (request.method !== "POST") {
    return methodNotAllowed(response, ["POST"]);
  }

  const adminUser = await requireAdminUser(request);
  const body = getRequestBody(request);
  const userId = (body.userId || "").trim();
  const role = body.role;

  if (!userId) {
    throw new ApiError(400, "BAD_REQUEST", "User ID is required.");
  }

  if (role !== "user" && role !== "admin") {
    throw new ApiError(400, "BAD_REQUEST", "A valid role is required.");
  }

  const user = await findUserById(userId);

  if (!user) {
    throw new ApiError(404, "NOT_FOUND", "User not found.");
  }

  const currentRole = user.role || "user";

  if (currentRole === role) {
    throw new ApiError(400, "BAD_REQUEST", "That user already has this role.");
  }

  if (userId === adminUser.sub) {
    throw new ApiError(
      403,
      "FORBIDDEN",
      "Admins cannot change their own admin role.",
    );
  }

  if (currentRole === "admin" && role === "user") {
    const adminCount = await countAdmins();

    if (adminCount <= 1) {
      throw new ApiError(
        403,
        "FORBIDDEN",
        "You cannot remove the last remaining admin.",
      );
    }
  }

  const updatedUser = await updateUserRoleById(userId, role);

  if (!updatedUser) {
    throw new ApiError(500, "INTERNAL_SERVER_ERROR", "Failed to update role.");
  }

  await createAdminAuditLog({
    actorUserId: adminUser.sub,
    actorEmail: adminUser.email,
    action: role === "admin" ? "admin.user.promoted" : "admin.user.demoted",
    targetUserId: userId,
    targetUserEmail: user.email,
    details: {
      previousRole: currentRole,
      nextRole: role,
    },
  });

  return sendJson(response, 200, {
    success: true,
    user: toPublicUser(updatedUser),
  });
};

const handleAdminResetPassword = async (
  request: VercelRequest,
  response: VercelResponse,
): Promise<VercelResponse> => {
  if (request.method !== "POST") {
    return methodNotAllowed(response, ["POST"]);
  }

  const adminUser = await requireAdminUser(request);
  const body = getRequestBody(request);
  const userId = (body.userId || "").trim();

  if (!userId) {
    throw new ApiError(400, "BAD_REQUEST", "User ID is required.");
  }

  if (userId === adminUser.sub) {
    throw new ApiError(
      403,
      "FORBIDDEN",
      "Admins cannot reset their own password from this screen.",
    );
  }

  const user = await findUserById(userId);

  if (!user?._id) {
    throw new ApiError(404, "NOT_FOUND", "User not found.");
  }

  const temporaryPassword = createTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);
  const updated = await updateUserPasswordById(userId, passwordHash);

  if (!updated) {
    throw new ApiError(
      500,
      "INTERNAL_SERVER_ERROR",
      "Failed to reset password.",
    );
  }

  await createAdminAuditLog({
    actorUserId: adminUser.sub,
    actorEmail: adminUser.email,
    action: "admin.user.password_reset",
    targetUserId: userId,
    targetUserEmail: user.email,
    details: {
      sessionsInvalidated: true,
    },
  });

  return sendJson(response, 200, {
    success: true,
    user: toPublicUser(user),
    temporaryPassword,
    message: "Temporary password generated and existing sessions invalidated.",
  });
};

const handleChangeEmail = async (
  request: VercelRequest,
  response: VercelResponse,
): Promise<VercelResponse> => {
  if (request.method !== "POST") {
    return methodNotAllowed(response, ["POST"]);
  }

  const authUser = await requireAuthenticatedUser(request);
  const body = getRequestBody(request);
  const email = validateEmail(body.email || "");
  const currentPassword = validatePassword(body.currentPassword || "");
  const user = await findUserById(authUser.sub);

  if (!user?._id) {
    throw new ApiError(404, "NOT_FOUND", "User not found.");
  }

  const isValidPassword = await verifyPassword(currentPassword, user.passwordHash);

  if (!isValidPassword) {
    throw new ApiError(401, "UNAUTHORIZED", "Current password is incorrect.");
  }

  if (user.email === email) {
    throw new ApiError(400, "BAD_REQUEST", "That email is already on your account.");
  }

  const existingUser = await findUserByEmail(email);

  if (existingUser?._id && existingUser._id.toString() !== user._id.toString()) {
    throw new ApiError(409, "CONFLICT", "Email is already in use.");
  }

  const updatedUser = await updateUserEmailById(authUser.sub, email);

  if (!updatedUser?._id) {
    throw new ApiError(500, "INTERNAL_SERVER_ERROR", "Failed to update email.");
  }

  console.info("[AUTH] User changed email", {
    userId: authUser.sub,
  });

  const token = signAuthToken({
    sub: updatedUser._id.toString(),
    email: updatedUser.email,
  });

  return sendJson(response, 200, {
    token,
    user: toPublicUser(updatedUser),
  });
};

const handleChangePassword = async (
  request: VercelRequest,
  response: VercelResponse,
): Promise<VercelResponse> => {
  if (request.method !== "POST") {
    return methodNotAllowed(response, ["POST"]);
  }

  const authUser = await requireAuthenticatedUser(request);
  const body = getRequestBody(request);
  const currentPassword = validatePassword(body.currentPassword || "");
  const newPassword = validatePassword(body.newPassword || "");
  const user = await findUserById(authUser.sub);

  if (!user?._id) {
    throw new ApiError(404, "NOT_FOUND", "User not found.");
  }

  const isValidPassword = await verifyPassword(currentPassword, user.passwordHash);

  if (!isValidPassword) {
    throw new ApiError(401, "UNAUTHORIZED", "Current password is incorrect.");
  }

  const nextPasswordHash = await hashPassword(newPassword);
  const updatedUser = await updateUserPasswordById(authUser.sub, nextPasswordHash);

  if (!updatedUser) {
    throw new ApiError(
      500,
      "INTERNAL_SERVER_ERROR",
      "Failed to update password.",
    );
  }

  console.info("[AUTH] User changed password", {
    userId: authUser.sub,
  });

  return sendJson(response, 200, {
    success: true,
    message: "Password updated. Sign in again with your new password.",
  });
};

const handleChangePreferredName = async (
  request: VercelRequest,
  response: VercelResponse,
): Promise<VercelResponse> => {
  if (request.method !== "POST") {
    return methodNotAllowed(response, ["POST"]);
  }

  const authUser = await requireAuthenticatedUser(request);
  const body = getRequestBody(request);
  const preferredName = normalizeOptionalString(body.preferredName);

  if (preferredName && preferredName.length > 80) {
    throw new ApiError(
      400,
      "BAD_REQUEST",
      "Preferred name must be 80 characters or fewer.",
    );
  }

  const updatedUser = await updateUserPreferredNameById(
    authUser.sub,
    preferredName,
  );

  if (!updatedUser?._id) {
    throw new ApiError(
      500,
      "INTERNAL_SERVER_ERROR",
      "Failed to update preferred name.",
    );
  }

  console.info("[AUTH] User changed preferred name", {
    userId: authUser.sub,
  });

  return sendJson(response, 200, toPublicUser(updatedUser));
};

const handleForgotPassword = async (
  request: VercelRequest,
  response: VercelResponse,
): Promise<VercelResponse> => {
  if (request.method !== "POST") {
    return methodNotAllowed(response, ["POST"]);
  }

  const body = getRequestBody(request);
  const email = validateEmail(body.email || "");
  const user = await findUserByEmail(email);

  if (user?._id) {
    const { expiresAt, otp } = await createPasswordResetOtp(user._id.toString());
    await sendPasswordResetEmail({
      email,
      expiresAt,
      otp,
      preferredName: user.preferredName,
    });
  }

  return sendJson(response, 200, {
    success: true,
    message:
      "If an account exists for that email, a one-time reset code has been sent.",
  });
};

const handleVerifyResetOtp = async (
  request: VercelRequest,
  response: VercelResponse,
): Promise<VercelResponse> => {
  if (request.method !== "POST") {
    return methodNotAllowed(response, ["POST"]);
  }

  const body = getRequestBody(request);
  const email = validateEmail(body.email || "");
  const otp = getResetOtp(body.otp);

  if (!otp) {
    throw new ApiError(400, "BAD_REQUEST", "Reset code is required.");
  }

  const user = await findUserByEmail(email);

  if (!user?._id) {
    throw new ApiError(400, "INVALID_RESET_OTP", "Code is invalid or expired.");
  }

  const result = await verifyPasswordResetOtp(user._id.toString(), otp);

  if (result.status === "exhausted") {
    throw new ApiError(
      400,
      "RESET_OTP_ATTEMPTS_EXHAUSTED",
      "Too many incorrect attempts. Request a new code.",
    );
  }

  if (result.status !== "valid") {
    throw new ApiError(400, "INVALID_RESET_OTP", "Code is invalid or expired.");
  }

  return sendJson(response, 200, {
    valid: true,
    expiresAt: result.record.expiresAt.toISOString(),
  });
};

const handleResetPassword = async (
  request: VercelRequest,
  response: VercelResponse,
): Promise<VercelResponse> => {
  if (request.method !== "POST") {
    return methodNotAllowed(response, ["POST"]);
  }

  const body = getRequestBody(request);
  const email = validateEmail(body.email || "");
  const otp = getResetOtp(body.otp);
  const password = validatePassword(body.password || "");

  if (!otp) {
    throw new ApiError(400, "BAD_REQUEST", "Reset code is required.");
  }

  const user = await findUserByEmail(email);

  if (!user?._id) {
    throw new ApiError(400, "INVALID_RESET_OTP", "Code is invalid or expired.");
  }

  const result = await verifyPasswordResetOtp(user._id.toString(), otp);

  if (result.status === "exhausted") {
    throw new ApiError(
      400,
      "RESET_OTP_ATTEMPTS_EXHAUSTED",
      "Too many incorrect attempts. Request a new code.",
    );
  }

  if (result.status !== "valid") {
    throw new ApiError(400, "INVALID_RESET_OTP", "Code is invalid or expired.");
  }

  const passwordHash = await hashPassword(password);
  const updatedUser = await updateUserPasswordById(
    result.record.userId,
    passwordHash,
  );

  if (!updatedUser) {
    throw new ApiError(404, "NOT_FOUND", "User not found.");
  }

  await consumePasswordResetOtp(result.record._id);
  await invalidatePasswordResetOtpsForUser(result.record.userId);

  return sendJson(response, 200, {
    success: true,
    message: "Password reset successful.",
  });
};

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
): Promise<VercelResponse | void> {
  try {
    await ensureBootstrapAdminUser();
    const action = resolveAction(request);

    if (action === "register") {
      return handleRegister(request, response);
    }

    if (action === "login") {
      return handleLogin(request, response);
    }

    if (action === "me") {
      return handleMe(request, response);
    }

    if (action === "account") {
      return handleDeleteAccount(request, response);
    }

    if (action === "admin-users") {
      return handleAdminUsers(request, response);
    }

    if (action === "admin-audit-logs") {
      return handleAdminAuditLogs(request, response);
    }

    if (action === "admin-system-announcements") {
      return handleAdminSystemAnnouncements(request, response);
    }

    if (action === "admin-system-announcement-update") {
      return handleAdminSystemAnnouncementUpdate(request, response);
    }

    if (action === "admin-system-announcement-delete") {
      return handleAdminSystemAnnouncementDelete(request, response);
    }

    if (action === "admin-user-detail") {
      return handleAdminUserDetail(request, response);
    }

    if (action === "system-announcements") {
      return handleSystemAnnouncements(request, response);
    }

    if (action === "system-announcement-seen") {
      return handleSystemAnnouncementSeen(request, response);
    }

    if (action === "system-announcement-dismiss") {
      return handleSystemAnnouncementDismiss(request, response);
    }

    if (action === "admin-delete-account") {
      return handleAdminDeleteAccount(request, response);
    }

    if (action === "admin-set-role") {
      return handleAdminSetRole(request, response);
    }

    if (action === "admin-reset-password") {
      return handleAdminResetPassword(request, response);
    }

    if (action === "change-email") {
      return handleChangeEmail(request, response);
    }

    if (action === "change-preferred-name") {
      return handleChangePreferredName(request, response);
    }

    if (action === "change-password") {
      return handleChangePassword(request, response);
    }

    if (action === "forgot-password") {
      return handleForgotPassword(request, response);
    }

    if (action === "verify-reset-otp") {
      return handleVerifyResetOtp(request, response);
    }

    if (action === "reset-password") {
      return handleResetPassword(request, response);
    }

    throw new ApiError(404, "NOT_FOUND", "Auth route not found.");
  } catch (error) {
    if (error instanceof CredentialValidationError) {
      return sendError(
        response,
        new ApiError(400, "BAD_REQUEST", error.message),
      );
    }

    if (error instanceof UnauthorizedError) {
      return sendError(
        response,
        new ApiError(401, "UNAUTHORIZED", error.message),
      );
    }

    if (error instanceof ForbiddenError) {
      return sendError(
        response,
        new ApiError(403, "FORBIDDEN", error.message),
      );
    }

    if (error instanceof MongoServerError && error.code === 11000) {
      return sendError(
        response,
        new ApiError(409, "CONFLICT", "Email is already in use."),
      );
    }

    return sendError(response, error);
  }
}
