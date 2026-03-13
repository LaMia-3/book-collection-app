import { VercelRequest, VercelResponse } from "@vercel/node";

import { ApiError, methodNotAllowed, sendError, sendJson } from "../lib/api-response.js";
import { validateCreateSeriesPayload } from "../lib/series-payload.js";
import { UnauthorizedError, requireAuthenticatedUser } from "../middleware/auth.js";
import {
  findSeriesById,
  insertSeries,
  listSeriesByUserId,
  toPublicSeries,
} from "../models/series.js";

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
): Promise<VercelResponse | void> {
  try {
    const authUser = requireAuthenticatedUser(request);

    if (request.method === "GET") {
      const series = await listSeriesByUserId(authUser.sub);
      return sendJson(
        response,
        200,
        series.map((seriesItem) => toPublicSeries(seriesItem)),
      );
    }

    if (request.method === "POST") {
      const seriesPayload = validateCreateSeriesPayload(request.body);
      const existingSeries = await findSeriesById(authUser.sub, seriesPayload.id);

      if (existingSeries) {
        throw new ApiError(
          409,
          "CONFLICT",
          "A series with that id already exists for this user.",
        );
      }

      const series = await insertSeries(authUser.sub, seriesPayload);
      return sendJson(response, 201, toPublicSeries(series));
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
