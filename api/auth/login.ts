import { VercelRequest, VercelResponse } from "@vercel/node";

import { ApiError, methodNotAllowed, sendError, sendJson } from "../lib/api-response.js";
import { signAuthToken } from "../lib/auth.js";
import {
  CredentialValidationError,
  validateLoginCredentials,
  verifyPassword,
} from "../lib/password.js";
import { findUserByEmail, toPublicUser } from "../models/user.js";

type LoginRequestBody = {
  email?: string;
  password?: string;
};

const getRequestBody = (request: VercelRequest): LoginRequestBody => {
  if (!request.body || typeof request.body !== "object") {
    return {};
  }

  return request.body as LoginRequestBody;
};

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
): Promise<VercelResponse | void> {
  if (request.method !== "POST") {
    return methodNotAllowed(response, ["POST"]);
  }

  try {
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
  } catch (error) {
    if (error instanceof CredentialValidationError) {
      return sendError(
        response,
        new ApiError(400, "BAD_REQUEST", error.message),
      );
    }

    return sendError(response, error);
  }
}
