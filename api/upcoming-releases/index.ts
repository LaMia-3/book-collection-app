import { VercelRequest, VercelResponse } from "@vercel/node";

import { ApiError, methodNotAllowed, sendError, sendJson } from "../../src/server/lib/api-response.js";
import {
  validateCreateUpcomingReleasePayload,
} from "../../src/server/lib/upcoming-release-payload.js";
import { UnauthorizedError, requireAuthenticatedUser } from "../../src/server/middleware/auth.js";
import {
  findUpcomingReleaseById,
  insertUpcomingRelease,
  listUpcomingReleasesByUserId,
  toPublicUpcomingRelease,
} from "../../src/server/models/upcoming-release.js";

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
): Promise<VercelResponse | void> {
  try {
    const authUser = await requireAuthenticatedUser(request);

    if (request.method === "GET") {
      const releases = await listUpcomingReleasesByUserId(authUser.sub);
      return sendJson(
        response,
        200,
        releases.map((release) => toPublicUpcomingRelease(release)),
      );
    }

    if (request.method === "POST") {
      const payload = validateCreateUpcomingReleasePayload(request.body);
      const existingRelease = await findUpcomingReleaseById(authUser.sub, payload.id);

      if (existingRelease) {
        throw new ApiError(
          409,
          "CONFLICT",
          "An upcoming release with that id already exists for this user.",
        );
      }

      const release = await insertUpcomingRelease(authUser.sub, payload);
      return sendJson(response, 201, toPublicUpcomingRelease(release));
    }

    return methodNotAllowed(response, ["GET", "POST"]);
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
