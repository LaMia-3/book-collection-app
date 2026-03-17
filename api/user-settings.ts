import { VercelRequest, VercelResponse } from "@vercel/node";

import { ApiError, methodNotAllowed, sendError, sendJson } from "../src/server/lib/api-response.js";
import { validateUpdateUserSettingsPayload } from "../src/server/lib/user-settings-payload.js";
import { UnauthorizedError, requireAuthenticatedUser } from "../src/server/middleware/auth.js";
import {
  findUserSettingsByUserId,
  toPublicUserSettings,
  upsertUserSettings,
} from "../src/server/models/user-settings.js";

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
): Promise<VercelResponse | void> {
  try {
    const authUser = await requireAuthenticatedUser(request);

    if (request.method === "GET") {
      const settings = await findUserSettingsByUserId(authUser.sub);
      return sendJson(
        response,
        200,
        settings ? toPublicUserSettings(settings) : null,
      );
    }

    if (request.method === "PUT") {
      const updates = validateUpdateUserSettingsPayload(request.body);
      const settings = await upsertUserSettings(authUser.sub, updates);
      return sendJson(response, 200, toPublicUserSettings(settings));
    }

    return methodNotAllowed(response, ["GET", "PUT"]);
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
