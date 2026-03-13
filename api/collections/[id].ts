import { VercelRequest, VercelResponse } from "@vercel/node";

import { ApiError, methodNotAllowed, sendError, sendJson } from "../lib/api-response.js";
import { validateUpdateCollectionPayload } from "../lib/collection-payload.js";
import { UnauthorizedError, requireAuthenticatedUser } from "../middleware/auth.js";
import {
  deleteCollection,
  findCollectionById,
  toPublicCollection,
  updateCollection,
} from "../models/collection.js";

const getCollectionIdFromRequest = (request: VercelRequest): string => {
  const rawId = request.query.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  if (!id || typeof id !== "string") {
    throw new ApiError(400, "BAD_REQUEST", "Collection id is required.");
  }

  return id;
};

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
): Promise<VercelResponse | void> {
  try {
    const authUser = requireAuthenticatedUser(request);
    const id = getCollectionIdFromRequest(request);

    if (request.method === "GET") {
      const collection = await findCollectionById(authUser.sub, id);

      if (!collection) {
        throw new ApiError(404, "NOT_FOUND", "Collection not found.");
      }

      return sendJson(response, 200, toPublicCollection(collection));
    }

    if (request.method === "PUT") {
      const updates = validateUpdateCollectionPayload(request.body);
      const collection = await updateCollection(authUser.sub, id, updates);

      if (!collection) {
        throw new ApiError(404, "NOT_FOUND", "Collection not found.");
      }

      return sendJson(response, 200, toPublicCollection(collection));
    }

    if (request.method === "DELETE") {
      const deleted = await deleteCollection(authUser.sub, id);

      if (!deleted) {
        throw new ApiError(404, "NOT_FOUND", "Collection not found.");
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
