import React, { ReactNode } from "react";

import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter, Routes, Route } from "react-router-dom";

import { AuthContext, AuthContextValue } from "@/contexts/auth-context";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

const baseAuthContext: AuthContextValue = {
  authError: null,
  changeEmail: jest.fn(),
  changePreferredName: jest.fn(),
  changePassword: jest.fn(),
  deleteAccount: jest.fn(),
  isAuthenticated: false,
  isLoadingAuth: false,
  login: jest.fn(),
  logout: jest.fn(),
  register: jest.fn(),
  user: null,
};

const renderProtectedRoute = (
  authValue: Partial<AuthContextValue>,
  element: ReactNode,
  requireAdmin = false,
  initialPath = "/protected",
) => {
  return render(
    <AuthContext.Provider value={{ ...baseAuthContext, ...authValue }}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route
            path="/protected"
            element={<ProtectedRoute requireAdmin={requireAdmin}>{element}</ProtectedRoute>}
          />
          <Route path="/login" element={<div>Login Screen</div>} />
          <Route path="/" element={<div>Home Screen</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
};

describe("ProtectedRoute", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows a loading spinner while auth is bootstrapping", () => {
    const { container } = renderProtectedRoute(
      { isLoadingAuth: true },
      <div>Protected Content</div>,
    );

    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });

  it("redirects unauthenticated users to login", () => {
    renderProtectedRoute({ isAuthenticated: false }, <div>Protected Content</div>);

    expect(screen.getByText("Login Screen")).toBeInTheDocument();
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });

  it("renders protected content for authenticated users", () => {
    renderProtectedRoute(
      {
        isAuthenticated: true,
        user: {
          id: "user-1",
          email: "reader@example.com",
          role: "user",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
      <div>Protected Content</div>,
    );

    expect(screen.getByText("Protected Content")).toBeInTheDocument();
  });

  it("redirects non-admin users away from admin-only routes", () => {
    renderProtectedRoute(
      {
        isAuthenticated: true,
        user: {
          id: "user-1",
          email: "reader@example.com",
          role: "user",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
      <div>Admin Content</div>,
      true,
    );

    expect(screen.getByText("Home Screen")).toBeInTheDocument();
    expect(screen.queryByText("Admin Content")).not.toBeInTheDocument();
  });

  it("allows admin users through admin-only routes", () => {
    renderProtectedRoute(
      {
        isAuthenticated: true,
        user: {
          id: "admin-1",
          email: "admin@example.com",
          role: "admin",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
      <div>Admin Content</div>,
      true,
    );

    expect(screen.getByText("Admin Content")).toBeInTheDocument();
  });
});
