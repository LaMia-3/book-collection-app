import { VercelRequest, VercelResponse } from "@vercel/node";

import { ApiError, methodNotAllowed, sendError, sendJson } from "../lib/api-response.js";
import {
  validateCreateBookPayload,
} from "../lib/book-payload.js";
import { UnauthorizedError, requireAuthenticatedUser } from "../middleware/auth.js";
import {
  findBookById,
  insertBook,
  listBooksByUserId,
  toPublicBook,
} from "../models/book.js";

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
): Promise<VercelResponse | void> {
  try {
    const authUser = requireAuthenticatedUser(request);

    if (request.method === "GET") {
      const books = await listBooksByUserId(authUser.sub);
      return sendJson(
        response,
        200,
        books.map((book) => toPublicBook(book)),
      );
    }

    if (request.method === "POST") {
      const bookPayload = validateCreateBookPayload(request.body);
      const existingBook = await findBookById(authUser.sub, bookPayload.id);

      if (existingBook) {
        throw new ApiError(
          409,
          "CONFLICT",
          "A book with that id already exists for this user.",
        );
      }

      const book = await insertBook(authUser.sub, bookPayload);
      return sendJson(response, 201, toPublicBook(book));
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
