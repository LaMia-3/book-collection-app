import { VercelRequest, VercelResponse } from "@vercel/node";

import { ApiError, methodNotAllowed, sendError, sendJson } from "../lib/api-response.js";
import { signAuthToken } from "../lib/auth.js";
import {
  CredentialValidationError,
  hashPassword,
  validateRegisterCredentials,
} from "../lib/password.js";
import { findUserByEmail, insertUser, toPublicUser } from "../models/user.js";

type RegisterRequestBody = {
  email?: string;
  password?: string;
  preferredName?: string;
};

const getRequestBody = (request: VercelRequest): RegisterRequestBody => {
  if (!request.body || typeof request.body !== "object") {
    return {};
  }

  return request.body as RegisterRequestBody;
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
