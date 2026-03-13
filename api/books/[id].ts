import { VercelRequest, VercelResponse } from "@vercel/node";

import { ApiError, methodNotAllowed, sendError, sendJson } from "../lib/api-response.js";
import { validateUpdateBookPayload } from "../lib/book-payload.js";
import { UnauthorizedError, requireAuthenticatedUser } from "../middleware/auth.js";
import {
  deleteBook,
  findBookById,
  toPublicBook,
  updateBook,
} from "../models/book.js";

const getBookIdFromRequest = (request: VercelRequest): string => {
  const rawId = request.query.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  if (!id || typeof id !== "string") {
    throw new ApiError(400, "BAD_REQUEST", "Book id is required.");
  }

  return id;
};

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
): Promise<VercelResponse | void> {
  try {
    const authUser = requireAuthenticatedUser(request);
    const id = getBookIdFromRequest(request);

    if (request.method === "GET") {
      const book = await findBookById(authUser.sub, id);

      if (!book) {
        throw new ApiError(404, "NOT_FOUND", "Book not found.");
      }

      return sendJson(response, 200, toPublicBook(book));
    }

    if (request.method === "PUT") {
      const updates = validateUpdateBookPayload(request.body);
      const book = await updateBook(authUser.sub, id, updates);

      if (!book) {
        throw new ApiError(404, "NOT_FOUND", "Book not found.");
      }

      return sendJson(response, 200, toPublicBook(book));
    }

    if (request.method === "DELETE") {
      const deleted = await deleteBook(authUser.sub, id);

      if (!deleted) {
        throw new ApiError(404, "NOT_FOUND", "Book not found.");
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
