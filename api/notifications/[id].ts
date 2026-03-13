import { VercelRequest, VercelResponse } from "@vercel/node";

import { ApiError, methodNotAllowed, sendError, sendJson } from "../lib/api-response.js";
import {
  validateUpdateNotificationPayload,
} from "../lib/notification-payload.js";
import { UnauthorizedError, requireAuthenticatedUser } from "../middleware/auth.js";
import {
  deleteNotification,
  findNotificationById,
  toPublicNotification,
  updateNotification,
} from "../models/notification.js";

const resolveNotificationId = (request: VercelRequest): string => {
  const value = request.query.id;
  const id = Array.isArray(value) ? value[0] : value;

  if (!id) {
    throw new ApiError(400, "BAD_REQUEST", "Notification id is required.");
  }

  return id;
};

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
): Promise<VercelResponse | void> {
  try {
    const authUser = requireAuthenticatedUser(request);
    const id = resolveNotificationId(request);

    if (request.method === "GET") {
      const notification = await findNotificationById(authUser.sub, id);

      if (!notification) {
        throw new ApiError(404, "NOT_FOUND", "Notification not found.");
      }

      return sendJson(response, 200, toPublicNotification(notification));
    }

    if (request.method === "PUT") {
      const updates = validateUpdateNotificationPayload(request.body);
      const notification = await updateNotification(authUser.sub, id, updates);

      if (!notification) {
        throw new ApiError(404, "NOT_FOUND", "Notification not found.");
      }

      return sendJson(response, 200, toPublicNotification(notification));
    }

    if (request.method === "DELETE") {
      const wasDeleted = await deleteNotification(authUser.sub, id);

      if (!wasDeleted) {
        throw new ApiError(404, "NOT_FOUND", "Notification not found.");
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
