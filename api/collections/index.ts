import { VercelRequest, VercelResponse } from "@vercel/node";

import { ApiError, methodNotAllowed, sendError, sendJson } from "../lib/api-response.js";
import { validateCreateCollectionPayload } from "../lib/collection-payload.js";
import { UnauthorizedError, requireAuthenticatedUser } from "../middleware/auth.js";
import {
  findCollectionById,
  insertCollection,
  listCollectionsByUserId,
  toPublicCollection,
} from "../models/collection.js";

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
): Promise<VercelResponse | void> {
  try {
    const authUser = requireAuthenticatedUser(request);

    if (request.method === "GET") {
      const collections = await listCollectionsByUserId(authUser.sub);
      return sendJson(
        response,
        200,
        collections.map((collection) => toPublicCollection(collection)),
      );
    }

    if (request.method === "POST") {
      const collectionPayload = validateCreateCollectionPayload(request.body);
      const existingCollection = await findCollectionById(authUser.sub, collectionPayload.id);

      if (existingCollection) {
        throw new ApiError(
          409,
          "CONFLICT",
          "A collection with that id already exists for this user.",
        );
      }

      const collection = await insertCollection(authUser.sub, collectionPayload);
      return sendJson(response, 201, toPublicCollection(collection));
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
