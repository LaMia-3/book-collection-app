import bcrypt from "bcryptjs";

const MIN_PASSWORD_LENGTH = 8;
const SALT_ROUNDS = 10;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class CredentialValidationError extends Error {
  statusCode = 400;

  constructor(message: string) {
    super(message);
    this.name = "CredentialValidationError";
  }
}

export type LoginCredentials = {
  email: string;
  password: string;
};

export type RegisterCredentials = LoginCredentials & {
  preferredName?: string;
};

export const validateEmail = (email: string): string => {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    throw new CredentialValidationError("Email is required.");
  }

  if (!EMAIL_PATTERN.test(normalizedEmail)) {
    throw new CredentialValidationError("Email must be valid.");
  }

  return normalizedEmail;
};

export const validatePassword = (password: string): string => {
  const normalizedPassword = password.trim();

  if (!normalizedPassword) {
    throw new CredentialValidationError("Password is required.");
  }

  if (normalizedPassword.length < MIN_PASSWORD_LENGTH) {
    throw new CredentialValidationError(
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`,
    );
  }

  return normalizedPassword;
};

export const validatePreferredName = (
  preferredName?: string,
): string | undefined => {
  const normalizedPreferredName = preferredName?.trim();

  return normalizedPreferredName || undefined;
};

export const validateLoginCredentials = ({
  email,
  password,
}: LoginCredentials): LoginCredentials => {
  return {
    email: validateEmail(email),
    password: validatePassword(password),
  };
};

export const validateRegisterCredentials = ({
  email,
  password,
  preferredName,
}: RegisterCredentials): RegisterCredentials => {
  return {
    email: validateEmail(email),
    password: validatePassword(password),
    preferredName: validatePreferredName(preferredName),
  };
};

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

export const verifyPassword = async (
  password: string,
  passwordHash: string,
): Promise<boolean> => {
  return bcrypt.compare(password, passwordHash);
};
