import { VercelRequest, VercelResponse } from "@vercel/node";

import { ApiError, methodNotAllowed, sendError, sendJson } from "../lib/api-response.js";
import {
  validateCreateNotificationPayload,
} from "../lib/notification-payload.js";
import { UnauthorizedError, requireAuthenticatedUser } from "../middleware/auth.js";
import {
  findNotificationById,
  insertNotification,
  listNotificationsByUserId,
  toPublicNotification,
} from "../models/notification.js";

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
): Promise<VercelResponse | void> {
  try {
    const authUser = requireAuthenticatedUser(request);

    if (request.method === "GET") {
      const notifications = await listNotificationsByUserId(authUser.sub);
      return sendJson(
        response,
        200,
        notifications.map((notification) => toPublicNotification(notification)),
      );
    }

    if (request.method === "POST") {
      const payload = validateCreateNotificationPayload(request.body);
      const existingNotification = await findNotificationById(authUser.sub, payload.id);

      if (existingNotification) {
        throw new ApiError(
          409,
          "CONFLICT",
          "A notification with that id already exists for this user.",
        );
      }

      const notification = await insertNotification(authUser.sub, payload);
      return sendJson(response, 201, toPublicNotification(notification));
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
