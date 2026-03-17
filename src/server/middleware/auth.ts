import { IncomingHttpHeaders } from "http";

import { AuthTokenPayload, verifyAuthToken } from "../lib/auth.js";
import { findUserById } from "../models/user.js";

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

export const requireAuthenticatedUser = async (
  source: HeaderSource,
): Promise<AuthTokenPayload> => {
  const token = getBearerToken(source);

  if (!token) {
    throw new UnauthorizedError();
  }

  let authPayload: AuthTokenPayload;

  try {
    authPayload = verifyAuthToken(token);
  } catch {
    throw new UnauthorizedError("Token is not valid.");
  }

  const user = await findUserById(authPayload.sub);

  if (!user) {
    throw new UnauthorizedError("User account is no longer available.");
  }

  if (user.sessionInvalidBefore) {
    const issuedAtMs = (authPayload.issuedAt || 0) * 1000;

    if (!issuedAtMs || issuedAtMs <= user.sessionInvalidBefore.getTime()) {
      throw new UnauthorizedError("Session has expired. Please sign in again.");
    }
  }

  return authPayload;
};
