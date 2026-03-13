import { VercelRequest, VercelResponse } from "@vercel/node";

import { ApiError, methodNotAllowed, sendError, sendJson } from "../lib/api-response.js";
import { UnauthorizedError, requireAuthenticatedUser } from "../middleware/auth.js";
import { findUserById, toPublicUser } from "../models/user.js";

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
): Promise<VercelResponse | void> {
  if (request.method !== "GET") {
    return methodNotAllowed(response, ["GET"]);
  }

  try {
    const authUser = requireAuthenticatedUser(request);
    const user = await findUserById(authUser.sub);

    if (!user) {
      throw new ApiError(404, "NOT_FOUND", "User not found.");
    }

    return sendJson(response, 200, toPublicUser(user));
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return sendError(
        response,
        new ApiError(401, "UNAUTHORIZED", error.message),
      );
    }

    return sendError(response, error);
  }
}
