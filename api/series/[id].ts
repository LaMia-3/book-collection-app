import { VercelRequest, VercelResponse } from "@vercel/node";

import { ApiError, methodNotAllowed, sendError, sendJson } from "../../src/server/lib/api-response.js";
import { validateUpdateSeriesPayload } from "../../src/server/lib/series-payload.js";
import { UnauthorizedError, requireAuthenticatedUser } from "../../src/server/middleware/auth.js";
import {
  deleteSeries,
  findSeriesById,
  toPublicSeries,
  updateSeries,
} from "../../src/server/models/series.js";

const getSeriesIdFromRequest = (request: VercelRequest): string => {
  const rawId = request.query.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  if (!id || typeof id !== "string") {
    throw new ApiError(400, "BAD_REQUEST", "Series id is required.");
  }

  return id;
};

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
): Promise<VercelResponse | void> {
  try {
    const authUser = requireAuthenticatedUser(request);
    const id = getSeriesIdFromRequest(request);

    if (request.method === "GET") {
      const series = await findSeriesById(authUser.sub, id);

      if (!series) {
        throw new ApiError(404, "NOT_FOUND", "Series not found.");
      }

      return sendJson(response, 200, toPublicSeries(series));
    }

    if (request.method === "PUT") {
      const updates = validateUpdateSeriesPayload(request.body);
      const series = await updateSeries(authUser.sub, id, updates);

      if (!series) {
        throw new ApiError(404, "NOT_FOUND", "Series not found.");
      }

      return sendJson(response, 200, toPublicSeries(series));
    }

    if (request.method === "DELETE") {
      const deleted = await deleteSeries(authUser.sub, id);

      if (!deleted) {
        throw new ApiError(404, "NOT_FOUND", "Series not found.");
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
