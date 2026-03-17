import jwt, { SignOptions } from "jsonwebtoken";

export type AuthTokenPayload = {
  sub: string;
  email?: string;
  issuedAt?: number;
};

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("Missing JWT_SECRET environment variable.");
  }

  return secret;
};

const getJwtExpiresIn = (): string => process.env.JWT_EXPIRES_IN || "7d";

export const signAuthToken = (
  payload: AuthTokenPayload,
  options: SignOptions = {},
): string => {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: getJwtExpiresIn(),
    ...options,
  });
};

export const verifyAuthToken = (token: string): AuthTokenPayload => {
  const decoded = jwt.verify(token, getJwtSecret());

  if (typeof decoded === "string") {
    throw new Error("Invalid JWT payload.");
  }

  if (typeof decoded.sub !== "string" || !decoded.sub) {
    throw new Error("JWT payload is missing a subject.");
  }

  return {
    sub: decoded.sub,
    email: typeof decoded.email === "string" ? decoded.email : undefined,
    issuedAt: typeof decoded.iat === "number" ? decoded.iat : undefined,
  };
};
