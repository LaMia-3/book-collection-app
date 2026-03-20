jest.mock("mongodb", () => ({
  MongoServerError: class MongoServerError extends Error {
    code?: number;
  },
}));

jest.mock("../../../src/server/lib/admin-bootstrap", () => ({
  ensureBootstrapAdminUser: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../../../src/server/lib/auth", () => ({
  signAuthToken: jest.fn().mockReturnValue("signed-token"),
}));

jest.mock("../../../src/server/lib/email", () => ({
  sendPasswordResetEmail: jest.fn(),
}));

jest.mock("../../../src/server/lib/password", () => ({
  CredentialValidationError: class CredentialValidationError extends Error {},
  hashPassword: jest.fn(),
  validateEmail: jest.fn((value: string) => value.trim().toLowerCase()),
  validateLoginCredentials: jest.fn((value: { email: string; password: string }) => value),
  validatePassword: jest.fn((value: string) => value),
  validateRegisterCredentials: jest.fn(
    (value: { email: string; password: string; preferredName?: string }) => value,
  ),
  verifyPassword: jest.fn(),
}));

jest.mock("../../../src/server/middleware/auth", () => ({
  ForbiddenError: class ForbiddenError extends Error {
    statusCode = 403;
  },
  UnauthorizedError: class UnauthorizedError extends Error {
    statusCode = 401;
  },
  requireAdminUser: jest.fn(),
  requireAuthenticatedUser: jest.fn(),
}));

jest.mock("../../../src/server/models/user", () => ({
  countAdmins: jest.fn(),
  findUserByEmail: jest.fn(),
  findUserById: jest.fn(),
  deleteUserById: jest.fn(),
  insertUser: jest.fn(),
  listUsers: jest.fn(),
  toPublicUser: jest.fn((user) => ({
    id: user._id?.toString?.() || user.id || "user-id",
    email: user.email,
    preferredName: user.preferredName,
    role: user.role || "user",
    createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : user.createdAt,
    lastLoginAt:
      user.lastLoginAt instanceof Date ? user.lastLoginAt.toISOString() : user.lastLoginAt,
    updatedAt: user.updatedAt instanceof Date ? user.updatedAt.toISOString() : user.updatedAt,
  })),
  updateUserEmailById: jest.fn(),
  updateUserLastLoginById: jest.fn(),
  updateUserPasswordById: jest.fn(),
  updateUserPreferredNameById: jest.fn(),
  updateUserRoleById: jest.fn(),
}));

jest.mock("../../../src/server/models/admin-audit-log", () => ({
  createAdminAuditLog: jest.fn(),
  listAdminAuditLogs: jest.fn(),
  toAdminAuditLogEntry: jest.fn(),
}));

jest.mock("../../../src/server/models/system-announcement", () => ({
  findSystemAnnouncementById: jest.fn(),
  insertSystemAnnouncement: jest.fn(),
  listActiveSystemAnnouncements: jest.fn(),
  listAllSystemAnnouncements: jest.fn(),
  toPublicSystemAnnouncement: jest.fn(),
  updateSystemAnnouncementById: jest.fn(),
  deleteSystemAnnouncementById: jest.fn(),
}));

jest.mock("../../../src/server/models/book", () => ({
  getBooksCollection: jest.fn(),
}));

jest.mock("../../../src/server/models/series", () => ({
  getSeriesCollection: jest.fn(),
}));

jest.mock("../../../src/server/models/collection", () => ({
  getCollectionsCollection: jest.fn(),
}));

jest.mock("../../../src/server/models/upcoming-release", () => ({
  getUpcomingReleasesCollection: jest.fn(),
}));

jest.mock("../../../src/server/models/notification", () => ({
  getNotificationsCollection: jest.fn(),
}));

jest.mock("../../../src/server/models/user-settings", () => ({
  getUserSettingsCollection: jest.fn(),
}));

jest.mock("../../../src/server/models/user-announcement-state", () => ({
  dismissAnnouncement: jest.fn(),
  getAnnouncementStateCounts: jest.fn(),
  getUserAnnouncementStates: jest.fn(),
  markAnnouncementSeen: jest.fn(),
}));

jest.mock("../../../src/server/models/password-reset-otp", () => ({
  consumePasswordResetOtp: jest.fn(),
  createPasswordResetOtp: jest.fn(),
  invalidatePasswordResetOtpsForUser: jest.fn(),
  verifyPasswordResetOtp: jest.fn(),
}));

import handler from "../[action]";
import { signAuthToken } from "@/server/lib/auth";
import {
  validateLoginCredentials,
  validateRegisterCredentials,
  verifyPassword,
  hashPassword,
} from "@/server/lib/password";
import { requireAuthenticatedUser } from "@/server/middleware/auth";
import {
  findUserByEmail,
  findUserById,
  insertUser,
  toPublicUser,
  updateUserEmailById,
  updateUserLastLoginById,
  updateUserPasswordById,
} from "@/server/models/user";

type MockResponse = {
  headers: Record<string, string>;
  jsonBody: unknown;
  statusCode: number;
  json: jest.Mock;
  setHeader: jest.Mock;
  status: jest.Mock;
};

type HandlerRequest = Parameters<typeof handler>[0];
type HandlerResponse = Parameters<typeof handler>[1];
type AuthSuccessBody = {
  token?: string;
  user?: {
    email: string;
  };
  email?: string;
};

const createMockResponse = (): MockResponse => {
  const response: MockResponse = {
    headers: {},
    jsonBody: undefined,
    statusCode: 200,
    json: jest.fn((body: unknown) => {
      response.jsonBody = body;
      return response;
    }),
    setHeader: jest.fn((name: string, value: string) => {
      response.headers[name] = value;
      return response;
    }),
    status: jest.fn((statusCode: number) => {
      response.statusCode = statusCode;
      return response;
    }),
  };

  return response;
};

const createRequest = (overrides: Record<string, unknown> = {}) =>
  ({
    body: {},
    headers: {},
    method: "GET",
    query: {},
    ...overrides,
  }) as unknown as HandlerRequest;

describe("auth action handler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("registers a new user and returns a token", async () => {
    const createdAt = new Date("2026-03-19T12:00:00.000Z");
    const updatedAt = new Date("2026-03-19T12:00:00.000Z");
    const insertedUser = {
      _id: { toString: () => "user-1" },
      email: "reader@example.com",
      preferredName: "Reader",
      role: "user",
      createdAt,
      updatedAt,
    };

    (validateRegisterCredentials as jest.Mock).mockReturnValue({
      email: "reader@example.com",
      password: "Password123!",
      preferredName: "Reader",
    });
    (findUserByEmail as jest.Mock).mockResolvedValue(null);
    (hashPassword as jest.Mock).mockResolvedValue("hashed-password");
    (insertUser as jest.Mock).mockResolvedValue(insertedUser);

    const request = createRequest({
      method: "POST",
      query: { action: "register" },
      body: {
        email: "reader@example.com",
        password: "Password123!",
        preferredName: "Reader",
      },
    });
    const response = createMockResponse();

    await handler(request, response as unknown as HandlerResponse);

    expect(insertUser).toHaveBeenCalledWith({
      email: "reader@example.com",
      passwordHash: "hashed-password",
      preferredName: "Reader",
    });
    expect(signAuthToken).toHaveBeenCalled();
    expect(response.statusCode).toBe(201);
    expect(response.jsonBody).toEqual({
      token: "signed-token",
      user: (toPublicUser as jest.Mock).mock.results[0]?.value || {
        id: "user-1",
        email: "reader@example.com",
        preferredName: "Reader",
        role: "user",
        createdAt: createdAt.toISOString(),
        updatedAt: updatedAt.toISOString(),
      },
    });
  });

  it("rejects register when the user already exists", async () => {
    (validateRegisterCredentials as jest.Mock).mockReturnValue({
      email: "reader@example.com",
      password: "Password123!",
    });
    (findUserByEmail as jest.Mock).mockResolvedValue({
      _id: { toString: () => "existing-user" },
      email: "reader@example.com",
    });

    const request = createRequest({
      method: "POST",
      query: { action: "register" },
      body: {
        email: "reader@example.com",
        password: "Password123!",
      },
    });
    const response = createMockResponse();

    await handler(request, response as unknown as HandlerResponse);

    expect(response.statusCode).toBe(409);
    expect(response.jsonBody).toEqual({
      error: {
        code: "CONFLICT",
        message: "User already exists.",
        details: undefined,
      },
    });
  });

  it("logs in a valid user and returns an updated user payload", async () => {
    const user = {
      _id: { toString: () => "user-1" },
      email: "reader@example.com",
      passwordHash: "stored-hash",
      role: "user",
      createdAt: new Date("2026-03-19T12:00:00.000Z"),
      updatedAt: new Date("2026-03-19T12:00:00.000Z"),
    };
    const updatedUser = {
      ...user,
      lastLoginAt: new Date("2026-03-19T13:00:00.000Z"),
      updatedAt: new Date("2026-03-19T13:00:00.000Z"),
    };

    (validateLoginCredentials as jest.Mock).mockReturnValue({
      email: "reader@example.com",
      password: "Password123!",
    });
    (findUserByEmail as jest.Mock).mockResolvedValue(user);
    (verifyPassword as jest.Mock).mockResolvedValue(true);
    (updateUserLastLoginById as jest.Mock).mockResolvedValue(updatedUser);

    const request = createRequest({
      method: "POST",
      query: { action: "login" },
      body: {
        email: "reader@example.com",
        password: "Password123!",
      },
    });
    const response = createMockResponse();

    await handler(request, response as unknown as HandlerResponse);

    expect(verifyPassword).toHaveBeenCalledWith("Password123!", "stored-hash");
    expect(updateUserLastLoginById).toHaveBeenCalledWith("user-1");
    expect(response.statusCode).toBe(200);
    const body = response.jsonBody as AuthSuccessBody;
    expect(body.token).toBe("signed-token");
    expect(body.user?.email).toBe("reader@example.com");
  });

  it("rejects login with invalid credentials", async () => {
    (validateLoginCredentials as jest.Mock).mockReturnValue({
      email: "reader@example.com",
      password: "wrong-password",
    });
    (findUserByEmail as jest.Mock).mockResolvedValue({
      _id: { toString: () => "user-1" },
      email: "reader@example.com",
      passwordHash: "stored-hash",
    });
    (verifyPassword as jest.Mock).mockResolvedValue(false);

    const request = createRequest({
      method: "POST",
      query: { action: "login" },
      body: {
        email: "reader@example.com",
        password: "wrong-password",
      },
    });
    const response = createMockResponse();

    await handler(request, response as unknown as HandlerResponse);

    expect(response.statusCode).toBe(401);
    expect(response.jsonBody).toEqual({
      error: {
        code: "UNAUTHORIZED",
        message: "Invalid credentials.",
        details: undefined,
      },
    });
  });

  it("returns the current user for the me route", async () => {
    const user = {
      _id: { toString: () => "user-1" },
      email: "reader@example.com",
      preferredName: "Reader",
      role: "user",
      createdAt: new Date("2026-03-19T12:00:00.000Z"),
      updatedAt: new Date("2026-03-19T12:00:00.000Z"),
    };

    (requireAuthenticatedUser as jest.Mock).mockResolvedValue({
      sub: "user-1",
      email: "reader@example.com",
    });
    (findUserById as jest.Mock).mockResolvedValue(user);

    const request = createRequest({
      method: "GET",
      query: { action: "me" },
      headers: { authorization: "Bearer signed-token" },
    });
    const response = createMockResponse();

    await handler(request, response as unknown as HandlerResponse);

    expect(requireAuthenticatedUser).toHaveBeenCalledWith(request);
    expect(findUserById).toHaveBeenCalledWith("user-1");
    expect(response.statusCode).toBe(200);
    expect((response.jsonBody as AuthSuccessBody).email).toBe("reader@example.com");
  });

  it("changes email for an authenticated user and returns a refreshed token", async () => {
    const user = {
      _id: { toString: () => "user-1" },
      email: "reader@example.com",
      preferredName: "Reader",
      passwordHash: "stored-hash",
      role: "user",
      createdAt: new Date("2026-03-19T12:00:00.000Z"),
      updatedAt: new Date("2026-03-19T12:00:00.000Z"),
    };
    const updatedUser = {
      ...user,
      email: "updated@example.com",
      updatedAt: new Date("2026-03-19T13:00:00.000Z"),
    };

    (requireAuthenticatedUser as jest.Mock).mockResolvedValue({
      sub: "user-1",
      email: "reader@example.com",
    });
    (findUserById as jest.Mock).mockResolvedValue(user);
    (verifyPassword as jest.Mock).mockResolvedValue(true);
    (findUserByEmail as jest.Mock).mockResolvedValueOnce(null);
    (updateUserEmailById as jest.Mock).mockResolvedValue(updatedUser);

    const request = createRequest({
      method: "POST",
      query: { action: "change-email" },
      headers: { authorization: "Bearer signed-token" },
      body: {
        email: "updated@example.com",
        currentPassword: "Password123!",
      },
    });
    const response = createMockResponse();

    await handler(request, response as unknown as HandlerResponse);

    expect(verifyPassword).toHaveBeenCalledWith("Password123!", "stored-hash");
    expect(updateUserEmailById).toHaveBeenCalledWith("user-1", "updated@example.com");
    expect(signAuthToken).toHaveBeenCalledWith({
      sub: "user-1",
      email: "updated@example.com",
    });
    expect(response.statusCode).toBe(200);
    expect((response.jsonBody as AuthSuccessBody).user?.email).toBe("updated@example.com");
  });

  it("rejects email change when the requested email is already used by another account", async () => {
    const user = {
      _id: { toString: () => "user-1" },
      email: "reader@example.com",
      passwordHash: "stored-hash",
    };

    (requireAuthenticatedUser as jest.Mock).mockResolvedValue({
      sub: "user-1",
      email: "reader@example.com",
    });
    (findUserById as jest.Mock).mockResolvedValue(user);
    (verifyPassword as jest.Mock).mockResolvedValue(true);
    (findUserByEmail as jest.Mock).mockResolvedValueOnce({
      _id: { toString: () => "user-2" },
      email: "taken@example.com",
    });

    const request = createRequest({
      method: "POST",
      query: { action: "change-email" },
      headers: { authorization: "Bearer signed-token" },
      body: {
        email: "taken@example.com",
        currentPassword: "Password123!",
      },
    });
    const response = createMockResponse();

    await handler(request, response as unknown as HandlerResponse);

    expect(response.statusCode).toBe(409);
    expect(response.jsonBody).toEqual({
      error: {
        code: "CONFLICT",
        message: "Email is already in use.",
        details: undefined,
      },
    });
  });

  it("changes password for an authenticated user", async () => {
    const user = {
      _id: { toString: () => "user-1" },
      email: "reader@example.com",
      passwordHash: "stored-hash",
    };

    (requireAuthenticatedUser as jest.Mock).mockResolvedValue({
      sub: "user-1",
      email: "reader@example.com",
    });
    (findUserById as jest.Mock).mockResolvedValue(user);
    (verifyPassword as jest.Mock).mockResolvedValue(true);
    (hashPassword as jest.Mock).mockResolvedValue("next-hash");
    (updateUserPasswordById as jest.Mock).mockResolvedValue({
      ...user,
      passwordHash: "next-hash",
    });

    const request = createRequest({
      method: "POST",
      query: { action: "change-password" },
      headers: { authorization: "Bearer signed-token" },
      body: {
        currentPassword: "Password123!",
        newPassword: "BetterPassword123!",
      },
    });
    const response = createMockResponse();

    await handler(request, response as unknown as HandlerResponse);

    expect(hashPassword).toHaveBeenCalledWith("BetterPassword123!");
    expect(updateUserPasswordById).toHaveBeenCalledWith("user-1", "next-hash");
    expect(response.statusCode).toBe(200);
    expect(response.jsonBody).toEqual({
      success: true,
      message: "Password updated. Sign in again with your new password.",
    });
  });

  it("rejects password change when the current password is incorrect", async () => {
    const user = {
      _id: { toString: () => "user-1" },
      email: "reader@example.com",
      passwordHash: "stored-hash",
    };

    (requireAuthenticatedUser as jest.Mock).mockResolvedValue({
      sub: "user-1",
      email: "reader@example.com",
    });
    (findUserById as jest.Mock).mockResolvedValue(user);
    (verifyPassword as jest.Mock).mockResolvedValue(false);

    const request = createRequest({
      method: "POST",
      query: { action: "change-password" },
      headers: { authorization: "Bearer signed-token" },
      body: {
        currentPassword: "wrong-password",
        newPassword: "BetterPassword123!",
      },
    });
    const response = createMockResponse();

    await handler(request, response as unknown as HandlerResponse);

    expect(response.statusCode).toBe(401);
    expect(response.jsonBody).toEqual({
      error: {
        code: "UNAUTHORIZED",
        message: "Current password is incorrect.",
        details: undefined,
      },
    });
  });
});
