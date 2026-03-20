jest.mock("node:crypto", () => ({
  randomBytes: jest.fn(() => ({
    toString: () => "temporary-password-123",
  })),
}));

jest.mock("mongodb", () => ({
  MongoServerError: class MongoServerError extends Error {
    code?: number;
  },
}));

jest.mock("../../../src/server/lib/admin-bootstrap", () => ({
  ensureBootstrapAdminUser: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../../../src/server/lib/auth", () => ({
  signAuthToken: jest.fn(),
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
  toAdminAuditLogEntry: jest.fn((log) => log),
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

const mockBooksCollection = { deleteMany: jest.fn(), countDocuments: jest.fn() };
const mockSeriesCollection = { deleteMany: jest.fn(), countDocuments: jest.fn() };
const mockCollectionsCollection = { deleteMany: jest.fn(), countDocuments: jest.fn() };
const mockUpcomingCollection = { deleteMany: jest.fn(), countDocuments: jest.fn() };
const mockNotificationsCollection = { deleteMany: jest.fn(), countDocuments: jest.fn() };
const mockUserSettingsCollection = { deleteMany: jest.fn(), countDocuments: jest.fn() };

jest.mock("../../../src/server/models/book", () => ({
  getBooksCollection: jest.fn(() => Promise.resolve(mockBooksCollection)),
}));

jest.mock("../../../src/server/models/series", () => ({
  getSeriesCollection: jest.fn(() => Promise.resolve(mockSeriesCollection)),
}));

jest.mock("../../../src/server/models/collection", () => ({
  getCollectionsCollection: jest.fn(() => Promise.resolve(mockCollectionsCollection)),
}));

jest.mock("../../../src/server/models/upcoming-release", () => ({
  getUpcomingReleasesCollection: jest.fn(() => Promise.resolve(mockUpcomingCollection)),
}));

jest.mock("../../../src/server/models/notification", () => ({
  getNotificationsCollection: jest.fn(() => Promise.resolve(mockNotificationsCollection)),
}));

jest.mock("../../../src/server/models/user-settings", () => ({
  getUserSettingsCollection: jest.fn(() => Promise.resolve(mockUserSettingsCollection)),
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
import { hashPassword } from "@/server/lib/password";
import {
  ForbiddenError,
  requireAdminUser,
} from "@/server/middleware/auth";
import {
  countAdmins,
  deleteUserById,
  findUserById,
  listUsers,
  toPublicUser,
  updateUserPasswordById,
  updateUserRoleById,
} from "@/server/models/user";
import { createAdminAuditLog } from "@/server/models/admin-audit-log";

type HandlerRequest = Parameters<typeof handler>[0];
type HandlerResponse = Parameters<typeof handler>[1];

type MockResponse = {
  headers: Record<string, string>;
  jsonBody: unknown;
  statusCode: number;
  json: jest.Mock;
  setHeader: jest.Mock;
  status: jest.Mock;
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

const adminUser = {
  _id: { toString: () => "admin-1" },
  email: "admin@example.com",
  role: "admin",
  createdAt: new Date("2026-03-19T12:00:00.000Z"),
  updatedAt: new Date("2026-03-19T12:00:00.000Z"),
};

describe("admin auth routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireAdminUser as jest.Mock).mockResolvedValue(adminUser);
    mockBooksCollection.deleteMany.mockResolvedValue({ deletedCount: 2 });
    mockSeriesCollection.deleteMany.mockResolvedValue({ deletedCount: 1 });
    mockCollectionsCollection.deleteMany.mockResolvedValue({ deletedCount: 1 });
    mockUpcomingCollection.deleteMany.mockResolvedValue({ deletedCount: 1 });
    mockNotificationsCollection.deleteMany.mockResolvedValue({ deletedCount: 3 });
    mockUserSettingsCollection.deleteMany.mockResolvedValue({ deletedCount: 1 });
  });

  it("blocks non-admin access to admin users", async () => {
    (requireAdminUser as jest.Mock).mockRejectedValue(
      new ForbiddenError("You do not have access to this resource."),
    );

    const request = createRequest({
      method: "GET",
      query: { action: "admin-users" },
    });
    const response = createMockResponse();

    await handler(request, response as unknown as HandlerResponse);

    expect(response.statusCode).toBe(403);
    expect(response.jsonBody).toEqual({
      error: {
        code: "FORBIDDEN",
        message: "You do not have access to this resource.",
        details: undefined,
      },
    });
  });

  it("lists users for an admin", async () => {
    const users = [
      {
        _id: { toString: () => "user-1" },
        email: "reader@example.com",
        role: "user",
        createdAt: new Date("2026-03-19T12:00:00.000Z"),
        updatedAt: new Date("2026-03-19T12:00:00.000Z"),
      },
    ];
    (listUsers as jest.Mock).mockResolvedValue(users);

    const request = createRequest({
      method: "GET",
      query: { action: "admin-users" },
    });
    const response = createMockResponse();

    await handler(request, response as unknown as HandlerResponse);

    expect(listUsers).toHaveBeenCalledTimes(1);
    expect(response.statusCode).toBe(200);
    expect(response.jsonBody).toEqual([(toPublicUser as jest.Mock).mock.results[0]?.value]);
  });

  it("promotes a user to admin and writes an audit log", async () => {
    const user = {
      _id: { toString: () => "user-1" },
      email: "reader@example.com",
      role: "user",
      createdAt: new Date("2026-03-19T12:00:00.000Z"),
      updatedAt: new Date("2026-03-19T12:00:00.000Z"),
    };
    const updatedUser = {
      ...user,
      role: "admin",
    };

    (findUserById as jest.Mock).mockResolvedValue(user);
    (updateUserRoleById as jest.Mock).mockResolvedValue(updatedUser);

    const request = createRequest({
      method: "POST",
      query: { action: "admin-set-role" },
      body: {
        userId: "user-1",
        role: "admin",
      },
    });
    const response = createMockResponse();

    await handler(request, response as unknown as HandlerResponse);

    expect(updateUserRoleById).toHaveBeenCalledWith("user-1", "admin");
    expect(createAdminAuditLog).toHaveBeenCalledWith({
      actorUserId: "admin-1",
      actorEmail: "admin@example.com",
      action: "admin.user.promoted",
      targetUserId: "user-1",
      targetUserEmail: "reader@example.com",
      details: {
        previousRole: "user",
        nextRole: "admin",
      },
    });
    expect(response.statusCode).toBe(200);
    expect((response.jsonBody as { success: boolean }).success).toBe(true);
  });

  it("blocks demotion of the last remaining admin", async () => {
    const user = {
      _id: { toString: () => "user-2" },
      email: "other-admin@example.com",
      role: "admin",
      createdAt: new Date("2026-03-19T12:00:00.000Z"),
      updatedAt: new Date("2026-03-19T12:00:00.000Z"),
    };

    (findUserById as jest.Mock).mockResolvedValue(user);
    (countAdmins as jest.Mock).mockResolvedValue(1);

    const request = createRequest({
      method: "POST",
      query: { action: "admin-set-role" },
      body: {
        userId: "user-2",
        role: "user",
      },
    });
    const response = createMockResponse();

    await handler(request, response as unknown as HandlerResponse);

    expect(updateUserRoleById).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(403);
    expect(response.jsonBody).toEqual({
      error: {
        code: "FORBIDDEN",
        message: "You cannot remove the last remaining admin.",
        details: undefined,
      },
    });
  });

  it("resets another user's password and writes an audit log", async () => {
    const user = {
      _id: { toString: () => "user-1" },
      email: "reader@example.com",
      role: "user",
      createdAt: new Date("2026-03-19T12:00:00.000Z"),
      updatedAt: new Date("2026-03-19T12:00:00.000Z"),
    };

    (findUserById as jest.Mock).mockResolvedValue(user);
    (hashPassword as jest.Mock).mockResolvedValue("hashed-temp-password");
    (updateUserPasswordById as jest.Mock).mockResolvedValue(true);

    const request = createRequest({
      method: "POST",
      query: { action: "admin-reset-password" },
      body: {
        userId: "user-1",
      },
    });
    const response = createMockResponse();

    await handler(request, response as unknown as HandlerResponse);

    expect(hashPassword).toHaveBeenCalledWith("temporary-password-123");
    expect(updateUserPasswordById).toHaveBeenCalledWith("user-1", "hashed-temp-password");
    expect(createAdminAuditLog).toHaveBeenCalledWith({
      actorUserId: "admin-1",
      actorEmail: "admin@example.com",
      action: "admin.user.password_reset",
      targetUserId: "user-1",
      targetUserEmail: "reader@example.com",
      details: {
        sessionsInvalidated: true,
      },
    });
    expect(response.statusCode).toBe(200);
    expect(response.jsonBody).toEqual({
      success: true,
      user: (toPublicUser as jest.Mock).mock.results.at(-1)?.value,
      temporaryPassword: "temporary-password-123",
      message: "Temporary password generated and existing sessions invalidated.",
    });
  });

  it("deletes another user account, returns a summary, and writes an audit log", async () => {
    const user = {
      _id: { toString: () => "user-1" },
      email: "reader@example.com",
      preferredName: "Reader",
      role: "user",
      createdAt: new Date("2026-03-19T12:00:00.000Z"),
      updatedAt: new Date("2026-03-19T12:00:00.000Z"),
    };

    (findUserById as jest.Mock).mockResolvedValue(user);
    (deleteUserById as jest.Mock).mockResolvedValue(true);

    const request = createRequest({
      method: "POST",
      query: { action: "admin-delete-account" },
      body: {
        userId: "user-1",
      },
    });
    const response = createMockResponse();

    await handler(request, response as unknown as HandlerResponse);

    expect(deleteUserById).toHaveBeenCalledWith("user-1");
    expect(createAdminAuditLog).toHaveBeenCalledWith({
      actorUserId: "admin-1",
      actorEmail: "admin@example.com",
      action: "admin.user.deleted",
      targetUserId: "user-1",
      targetUserEmail: "reader@example.com",
      details: {
        summary: {
          books: 2,
          series: 1,
          collections: 1,
          upcomingReleases: 1,
          notifications: 3,
          userSettings: 1,
        },
        role: "user",
      },
    });
    expect(response.statusCode).toBe(200);
    expect(response.jsonBody).toEqual({
      success: true,
      deletedUser: {
        id: "user-1",
        email: "reader@example.com",
        preferredName: "Reader",
        role: "user",
      },
      summary: {
        books: 2,
        series: 1,
        collections: 1,
        upcomingReleases: 1,
        notifications: 3,
        userSettings: 1,
      },
    });
  });

  it("blocks admin self-delete", async () => {
    const request = createRequest({
      method: "POST",
      query: { action: "admin-delete-account" },
      body: {
        userId: "admin-1",
      },
    });
    const response = createMockResponse();

    await handler(request, response as unknown as HandlerResponse);

    expect(response.statusCode).toBe(403);
    expect(response.jsonBody).toEqual({
      error: {
        code: "FORBIDDEN",
        message: "Admins cannot delete their own account.",
        details: undefined,
      },
    });
  });
});
