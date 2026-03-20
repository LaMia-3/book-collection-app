import { IncomingHttpHeaders } from "http";

import { AuthTokenPayload, verifyAuthToken } from "../lib/auth.js";
import { findUserById, UserDocument } from "../models/user.js";

type WrappedHeaderSource = {
  headers: Headers | IncomingHttpHeaders;
};

type HeaderSource = Headers | IncomingHttpHeaders | WrappedHeaderSource;

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

const isWrappedHeaderSource = (
  source: HeaderSource,
): source is WrappedHeaderSource => {
  if (source instanceof Headers) {
    return false;
  }

  const candidate = (source as WrappedHeaderSource).headers;

  return typeof candidate === "object" && candidate !== null && !Array.isArray(candidate);
};

const resolveHeaders = (
  source: HeaderSource,
): Headers | IncomingHttpHeaders => {
  if (source instanceof Headers) {
    return source;
  }

  if (isWrappedHeaderSource(source)) {
    return source.headers;
  }

  return source as IncomingHttpHeaders;
};

export class UnauthorizedError extends Error {
  statusCode = 401;

  constructor(message = "Authentication required.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  statusCode = 403;

  constructor(message = "You do not have access to this resource.") {
    super(message);
    this.name = "ForbiddenError";
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

export const requireAdminUser = async (
  source: HeaderSource,
): Promise<UserDocument & { _id: NonNullable<UserDocument["_id"]> }> => {
  const authPayload = await requireAuthenticatedUser(source);
  const user = await findUserById(authPayload.sub);

  if (!user?._id) {
    throw new UnauthorizedError("User account is no longer available.");
  }

  if ((user.role || "user") !== "admin") {
    throw new ForbiddenError();
  }

  return user as UserDocument & { _id: NonNullable<UserDocument["_id"]> };
};
