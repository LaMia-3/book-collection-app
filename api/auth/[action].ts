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
  insertUser,
  toPublicUser,
} from "../../src/server/models/user.js";

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
