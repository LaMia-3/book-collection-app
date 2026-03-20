import React, { useContext } from "react";

import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

import { AuthProvider } from "@/contexts/AuthContext";
import { AuthContext } from "@/contexts/auth-context";
import { ApiClientError, authApi } from "@/lib/apiClient";
import {
  clearStoredAuthSession,
  getStoredAuthToken,
  getStoredAuthUser,
  setStoredAuthUser,
} from "@/lib/auth-storage";

jest.mock("@/lib/apiClient", () => ({
  ApiClientError: class ApiClientError extends Error {
    status: number;

    constructor(status: number, message: string) {
      super(message);
      this.status = status;
      this.name = "ApiClientError";
    }
  },
  authApi: {
    me: jest.fn(),
    login: jest.fn(),
    register: jest.fn(),
    deleteAccount: jest.fn(),
    changeEmail: jest.fn(),
    changePreferredName: jest.fn(),
    changePassword: jest.fn(),
  },
}));

jest.mock("@/lib/auth-storage", () => ({
  clearStoredAuthSession: jest.fn(),
  getStoredAuthToken: jest.fn(),
  getStoredAuthUser: jest.fn(),
  setStoredAuthToken: jest.fn(),
  setStoredAuthUser: jest.fn(),
}));

const mockedAuthApi = authApi as jest.Mocked<typeof authApi>;
const mockedGetStoredAuthToken = getStoredAuthToken as jest.MockedFunction<typeof getStoredAuthToken>;
const mockedGetStoredAuthUser = getStoredAuthUser as jest.MockedFunction<typeof getStoredAuthUser>;
const mockedSetStoredAuthUser = setStoredAuthUser as jest.MockedFunction<typeof setStoredAuthUser>;
const mockedClearStoredAuthSession = clearStoredAuthSession as jest.MockedFunction<
  typeof clearStoredAuthSession
>;

const AuthProbe = () => {
  const auth = useContext(AuthContext);

  if (!auth) {
    return <div>No auth context</div>;
  }

  return (
    <div>
      <div data-testid="loading">{String(auth.isLoadingAuth)}</div>
      <div data-testid="authenticated">{String(auth.isAuthenticated)}</div>
      <div data-testid="user-email">{auth.user?.email ?? "none"}</div>
      <div data-testid="auth-error">{auth.authError ?? "none"}</div>
    </div>
  );
};

describe("AuthProvider bootstrap", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetStoredAuthUser.mockReturnValue(null);
  });

  it("restores the current user when a stored token is valid", async () => {
    const currentUser = {
      id: "user-1",
      email: "reader@example.com",
      role: "user" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockedGetStoredAuthToken.mockReturnValue("valid-token");
    mockedAuthApi.me.mockResolvedValue(currentUser);

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("loading")).toHaveTextContent("false"),
    );

    expect(mockedAuthApi.me).toHaveBeenCalledTimes(1);
    expect(mockedSetStoredAuthUser).toHaveBeenCalledWith(currentUser);
    expect(screen.getByTestId("authenticated")).toHaveTextContent("true");
    expect(screen.getByTestId("user-email")).toHaveTextContent("reader@example.com");
    expect(screen.getByTestId("auth-error")).toHaveTextContent("none");
  });

  it("clears the stored session when bootstrap fails", async () => {
    mockedGetStoredAuthToken.mockReturnValue("stale-token");
    mockedAuthApi.me.mockRejectedValue(
      new ApiClientError(401, "Session has expired. Please sign in again."),
    );

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("loading")).toHaveTextContent("false"),
    );

    expect(mockedClearStoredAuthSession).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("authenticated")).toHaveTextContent("false");
    expect(screen.getByTestId("user-email")).toHaveTextContent("none");
    expect(screen.getByTestId("auth-error")).toHaveTextContent(
      "Session has expired. Please sign in again.",
    );
  });
});
