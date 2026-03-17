import { VercelRequest, VercelResponse } from "@vercel/node";
import { MongoServerError } from "mongodb";

import { ApiError, methodNotAllowed, sendError, sendJson } from "../../src/server/lib/api-response.js";
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
  findUserByEmail,
  findUserById,
  deleteUserById,
  insertUser,
  listUsers,
  toPublicUser,
  updateUserEmailById,
  updateUserPasswordById,
} from "../../src/server/models/user.js";
import { getBooksCollection } from "../../src/server/models/book.js";
import { getSeriesCollection } from "../../src/server/models/series.js";
import { getCollectionsCollection } from "../../src/server/models/collection.js";
import { getUpcomingReleasesCollection } from "../../src/server/models/upcoming-release.js";
import { getNotificationsCollection } from "../../src/server/models/notification.js";
import { getUserSettingsCollection } from "../../src/server/models/user-settings.js";
import {
  consumePasswordResetOtp,
  createPasswordResetOtp,
  invalidatePasswordResetOtpsForUser,
  verifyPasswordResetOtp,
} from "../../src/server/models/password-reset-otp.js";

type AuthRequestBody = {
  currentPassword?: string;
  email?: string;
  newPassword?: string;
  otp?: string;
  password?: string;
  preferredName?: string;
};

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

  const token = signAuthToken({
    sub: user._id!.toString(),
    email: user.email,
  });

  return sendJson(response, 200, {
    token,
    user: toPublicUser(user),
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

  await Promise.all([
    booksCollection.deleteMany({ userId: authUser.sub }),
    seriesCollection.deleteMany({ userId: authUser.sub }),
    collectionsCollection.deleteMany({ userId: authUser.sub }),
    upcomingReleasesCollection.deleteMany({ userId: authUser.sub }),
    notificationsCollection.deleteMany({ userId: authUser.sub }),
    userSettingsCollection.deleteMany({ userId: authUser.sub }),
  ]);

  const userDeleted = await deleteUserById(authUser.sub);

  if (!userDeleted) {
    throw new ApiError(500, "INTERNAL_SERVER_ERROR", "Failed to delete account.");
  }

  return sendJson(response, 200, { success: true });
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

    if (action === "admin-user-detail") {
      return handleAdminUserDetail(request, response);
    }

    if (action === "change-email") {
      return handleChangeEmail(request, response);
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
