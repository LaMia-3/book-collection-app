import { IncomingHttpHeaders } from "http";

import { AuthTokenPayload, verifyAuthToken } from "../lib/auth";

type HeaderSource =
  | Headers
  | IncomingHttpHeaders
  | {
      headers: Headers | IncomingHttpHeaders;
    };

const getHeaderValue = (
  headers: Headers | IncomingHttpHeaders,
  name: string,
): string | null => {
  if (headers instanceof Headers) {
    return headers.get(name);
  }

  const value = headers[name.toLowerCase()];

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
};

const resolveHeaders = (
  source: HeaderSource,
): Headers | IncomingHttpHeaders => {
  if ("headers" in source && !(source instanceof Headers)) {
    return source.headers;
  }

  return source;
};

export class UnauthorizedError extends Error {
  statusCode = 401;

  constructor(message = "Authentication required.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export const getBearerToken = (source: HeaderSource): string | null => {
  const headerValue = getHeaderValue(resolveHeaders(source), "authorization");

  if (!headerValue) {
    return null;
  }

  const [scheme, token] = headerValue.split(" ");

  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
};

export const requireAuthenticatedUser = (
  source: HeaderSource,
): AuthTokenPayload => {
  const token = getBearerToken(source);

  if (!token) {
    throw new UnauthorizedError();
  }

  try {
    return verifyAuthToken(token);
  } catch {
    throw new UnauthorizedError("Token is not valid.");
  }
};
