import { VercelRequest, VercelResponse } from "@vercel/node";

import { ApiError, methodNotAllowed, sendError, sendJson } from "../../src/server/lib/api-response.js";
import {
  validateUpdateUpcomingReleasePayload,
} from "../../src/server/lib/upcoming-release-payload.js";
import { UnauthorizedError, requireAuthenticatedUser } from "../../src/server/middleware/auth.js";
import {
  deleteUpcomingRelease,
  findUpcomingReleaseById,
  toPublicUpcomingRelease,
  updateUpcomingRelease,
} from "../../src/server/models/upcoming-release.js";

const resolveUpcomingReleaseId = (request: VercelRequest): string => {
  const value = request.query.id;
  const id = Array.isArray(value) ? value[0] : value;

  if (!id) {
    throw new ApiError(400, "BAD_REQUEST", "Upcoming release id is required.");
  }

  return id;
};

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
): Promise<VercelResponse | void> {
  try {
    const authUser = await requireAuthenticatedUser(request);
    const id = resolveUpcomingReleaseId(request);

    if (request.method === "GET") {
      const release = await findUpcomingReleaseById(authUser.sub, id);

      if (!release) {
        throw new ApiError(404, "NOT_FOUND", "Upcoming release not found.");
      }

      return sendJson(response, 200, toPublicUpcomingRelease(release));
    }

    if (request.method === "PUT") {
      const updates = validateUpdateUpcomingReleasePayload(request.body);
      const release = await updateUpcomingRelease(authUser.sub, id, updates);

      if (!release) {
        throw new ApiError(404, "NOT_FOUND", "Upcoming release not found.");
      }

      return sendJson(response, 200, toPublicUpcomingRelease(release));
    }

    if (request.method === "DELETE") {
      const wasDeleted = await deleteUpcomingRelease(authUser.sub, id);

      if (!wasDeleted) {
        throw new ApiError(404, "NOT_FOUND", "Upcoming release not found.");
      }

      return sendJson(response, 200, { success: true });
    }

    return methodNotAllowed(response, ["GET", "PUT", "DELETE"]);
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
