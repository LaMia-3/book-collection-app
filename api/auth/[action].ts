import { VercelRequest, VercelResponse } from "@vercel/node";

import { ApiError, methodNotAllowed, sendError, sendJson } from "../../src/server/lib/api-response.js";
import { signAuthToken } from "../../src/server/lib/auth.js";
import {
  CredentialValidationError,
  hashPassword,
  validateLoginCredentials,
  validateRegisterCredentials,
  verifyPassword,
} from "../../src/server/lib/password.js";
import { UnauthorizedError, requireAuthenticatedUser } from "../../src/server/middleware/auth.js";
import {
  findUserByEmail,
  findUserById,
  deleteUserById,
  insertUser,
  toPublicUser,
} from "../../src/server/models/user.js";
import { getBooksCollection } from "../../src/server/models/book.js";
import { getSeriesCollection } from "../../src/server/models/series.js";
import { getCollectionsCollection } from "../../src/server/models/collection.js";
import { getUpcomingReleasesCollection } from "../../src/server/models/upcoming-release.js";
import { getNotificationsCollection } from "../../src/server/models/notification.js";
import { getUserSettingsCollection } from "../../src/server/models/user-settings.js";

type AuthRequestBody = {
  email?: string;
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

  const authUser = requireAuthenticatedUser(request);
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

  const authUser = requireAuthenticatedUser(request);
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

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
): Promise<VercelResponse | void> {
  try {
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

    return sendError(response, error);
  }
}
