import { VercelResponse } from "@vercel/node";

export type ApiErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "CONFLICT"
  | "METHOD_NOT_ALLOWED"
  | "INTERNAL_SERVER_ERROR";

export class ApiError extends Error {
  statusCode: number;
  code: ApiErrorCode;
  details?: unknown;

  constructor(
    statusCode: number,
    code: ApiErrorCode,
    message: string,
    details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export const sendJson = <T>(
  response: VercelResponse,
  statusCode: number,
  body: T,
): VercelResponse => {
  return response.status(statusCode).json(body);
};

export const sendError = (
  response: VercelResponse,
  error: unknown,
): VercelResponse => {
  if (error instanceof ApiError) {
    return response.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    });
  }

  return response.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred.",
    },
  });
};

export const methodNotAllowed = (
  response: VercelResponse,
  allowedMethods: string[],
): VercelResponse => {
  response.setHeader("Allow", allowedMethods.join(", "));

  return sendError(
    response,
    new ApiError(
      405,
      "METHOD_NOT_ALLOWED",
      `Method not allowed. Expected one of: ${allowedMethods.join(", ")}.`,
    ),
  );
};
