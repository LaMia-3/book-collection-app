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
  toPublicUser: jest.fn(),
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
  toPublicSystemAnnouncement: jest.fn((announcement) => ({
    id: announcement._id.toString(),
    title: announcement.title,
    body: announcement.body,
    kind: announcement.kind,
    severity: announcement.severity,
    isActive: announcement.isActive,
    environment: announcement.environment,
    createdAt: announcement.createdAt.toISOString(),
    updatedAt: announcement.updatedAt.toISOString(),
  })),
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
import { requireAuthenticatedUser } from "@/server/middleware/auth";
import {
  dismissAnnouncement,
  getUserAnnouncementStates,
  markAnnouncementSeen,
} from "@/server/models/user-announcement-state";
import {
  findSystemAnnouncementById,
  listActiveSystemAnnouncements,
} from "@/server/models/system-announcement";

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

describe("system announcement routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireAuthenticatedUser as jest.Mock).mockResolvedValue({
      sub: "user-1",
      email: "reader@example.com",
    });
  });

  it("returns only non-dismissed announcements and marks seen state correctly", async () => {
    const announcements = [
      {
        _id: { toString: () => "announcement-1" },
        title: "Visible update",
        body: "Body",
        kind: "feature",
        severity: "info",
        isActive: true,
        environment: "preview",
        createdAt: new Date("2026-03-19T10:00:00.000Z"),
        updatedAt: new Date("2026-03-19T10:00:00.000Z"),
      },
      {
        _id: { toString: () => "announcement-2" },
        title: "Dismissed update",
        body: "Body",
        kind: "warning",
        severity: "warning",
        isActive: true,
        environment: "preview",
        createdAt: new Date("2026-03-19T09:00:00.000Z"),
        updatedAt: new Date("2026-03-19T09:00:00.000Z"),
      },
    ];

    (listActiveSystemAnnouncements as jest.Mock).mockResolvedValue(announcements);
    (getUserAnnouncementStates as jest.Mock).mockResolvedValue([
      {
        announcementId: "announcement-1",
        seenAt: new Date("2026-03-19T11:00:00.000Z"),
      },
      {
        announcementId: "announcement-2",
        dismissedAt: new Date("2026-03-19T11:30:00.000Z"),
      },
    ]);

    const request = createRequest({
      method: "GET",
      query: { action: "system-announcements" },
      headers: { "x-app-version": "2.0.0" },
    });
    const response = createMockResponse();

    await handler(request, response as unknown as HandlerResponse);

    expect(listActiveSystemAnnouncements).toHaveBeenCalledWith({
      appVersion: "2.0.0",
      environment: "preview",
    });
    expect(response.statusCode).toBe(200);
    expect(response.jsonBody).toEqual([
      expect.objectContaining({
        id: "announcement-1",
        title: "Visible update",
        isSeen: true,
        dismissedAt: undefined,
      }),
    ]);
  });

  it("marks an announcement as seen for the authenticated user", async () => {
    (findSystemAnnouncementById as jest.Mock).mockResolvedValue({
      _id: { toString: () => "announcement-1" },
    });

    const request = createRequest({
      method: "POST",
      query: { action: "system-announcement-seen" },
      body: { announcementId: "announcement-1" },
    });
    const response = createMockResponse();

    await handler(request, response as unknown as HandlerResponse);

    expect(markAnnouncementSeen).toHaveBeenCalledWith("user-1", "announcement-1");
    expect(response.statusCode).toBe(200);
    expect(response.jsonBody).toEqual({ success: true });
  });

  it("dismisses an announcement for the authenticated user", async () => {
    (findSystemAnnouncementById as jest.Mock).mockResolvedValue({
      _id: { toString: () => "announcement-1" },
    });

    const request = createRequest({
      method: "POST",
      query: { action: "system-announcement-dismiss" },
      body: { announcementId: "announcement-1" },
    });
    const response = createMockResponse();

    await handler(request, response as unknown as HandlerResponse);

    expect(dismissAnnouncement).toHaveBeenCalledWith("user-1", "announcement-1");
    expect(response.statusCode).toBe(200);
    expect(response.jsonBody).toEqual({ success: true });
  });

  it("returns 404 when marking a missing announcement as seen", async () => {
    (findSystemAnnouncementById as jest.Mock).mockResolvedValue(null);

    const request = createRequest({
      method: "POST",
      query: { action: "system-announcement-seen" },
      body: { announcementId: "missing-announcement" },
    });
    const response = createMockResponse();

    await handler(request, response as unknown as HandlerResponse);

    expect(response.statusCode).toBe(404);
    expect(response.jsonBody).toEqual({
      error: {
        code: "NOT_FOUND",
        message: "Announcement not found.",
        details: undefined,
      },
    });
  });
});
