import {
  ForbiddenError,
  UnauthorizedError,
  getBearerToken,
  requireAdminUser,
  requireAuthenticatedUser,
} from "@/server/middleware/auth";

jest.mock("@/server/lib/auth", () => ({
  verifyAuthToken: jest.fn(),
}));

jest.mock("@/server/models/user", () => ({
  findUserById: jest.fn(),
}));

import { verifyAuthToken } from "@/server/lib/auth";
import { findUserById } from "@/server/models/user";

const mockedVerifyAuthToken = verifyAuthToken as jest.MockedFunction<typeof verifyAuthToken>;
const mockedFindUserById = findUserById as jest.MockedFunction<typeof findUserById>;

describe("auth middleware", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getBearerToken", () => {
    it("returns the token for a valid bearer header", () => {
      expect(
        getBearerToken({
          headers: {
            authorization: "Bearer valid-token",
          },
        }),
      ).toBe("valid-token");
    });

    it("returns null for non-bearer authorization headers", () => {
      expect(
        getBearerToken({
          headers: {
            authorization: "Basic abc123",
          },
        }),
      ).toBeNull();
    });
  });

  describe("requireAuthenticatedUser", () => {
    it("throws when the authorization header is missing", async () => {
      await expect(requireAuthenticatedUser({ headers: {} })).rejects.toBeInstanceOf(
        UnauthorizedError,
      );
    });

    it("throws when token verification fails", async () => {
      mockedVerifyAuthToken.mockImplementation(() => {
        throw new Error("bad token");
      });

      await expect(
        requireAuthenticatedUser({
          headers: { authorization: "Bearer invalid-token" },
        }),
      ).rejects.toMatchObject({ message: "Token is not valid." });
    });

    it("throws when the user no longer exists", async () => {
      mockedVerifyAuthToken.mockReturnValue({ sub: "user-1", issuedAt: 200 });
      mockedFindUserById.mockResolvedValue(null);

      await expect(
        requireAuthenticatedUser({
          headers: { authorization: "Bearer valid-token" },
        }),
      ).rejects.toMatchObject({ message: "User account is no longer available." });
    });

    it("throws when the session has been invalidated after token issue time", async () => {
      mockedVerifyAuthToken.mockReturnValue({ sub: "user-1", issuedAt: 100 });
      mockedFindUserById.mockResolvedValue({
        _id: "mongo-id" as never,
        id: "user-1",
        email: "reader@example.com",
        passwordHash: "hash",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        sessionInvalidBefore: new Date(101000),
      } as never);

      await expect(
        requireAuthenticatedUser({
          headers: { authorization: "Bearer valid-token" },
        }),
      ).rejects.toMatchObject({ message: "Session has expired. Please sign in again." });
    });

    it("returns the auth payload for a valid active session", async () => {
      mockedVerifyAuthToken.mockReturnValue({ sub: "user-1", issuedAt: 200 });
      mockedFindUserById.mockResolvedValue({
        _id: "mongo-id" as never,
        id: "user-1",
        email: "reader@example.com",
        passwordHash: "hash",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);

      await expect(
        requireAuthenticatedUser({
          headers: { authorization: "Bearer valid-token" },
        }),
      ).resolves.toEqual({ sub: "user-1", issuedAt: 200 });
    });
  });

  describe("requireAdminUser", () => {
    it("throws when the authenticated user is not an admin", async () => {
      mockedVerifyAuthToken.mockReturnValue({ sub: "user-1", issuedAt: 200 });
      mockedFindUserById.mockResolvedValue({
        _id: "mongo-id" as never,
        id: "user-1",
        email: "reader@example.com",
        passwordHash: "hash",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);

      await expect(
        requireAdminUser({
          headers: { authorization: "Bearer valid-token" },
        }),
      ).rejects.toBeInstanceOf(ForbiddenError);
    });

    it("returns the user record for an admin", async () => {
      mockedVerifyAuthToken.mockReturnValue({ sub: "admin-1", issuedAt: 200 });
      mockedFindUserById.mockResolvedValue({
        _id: "mongo-id" as never,
        id: "admin-1",
        email: "admin@example.com",
        passwordHash: "hash",
        role: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);

      await expect(
        requireAdminUser({
          headers: { authorization: "Bearer valid-token" },
        }),
      ).resolves.toMatchObject({
        id: "admin-1",
        role: "admin",
      });
    });
  });
});
