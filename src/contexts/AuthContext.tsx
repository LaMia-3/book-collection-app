import { ReactNode, useEffect, useState } from "react";

import {
  ApiClientError,
  authApi,
} from "@/lib/apiClient";
import {
  AuthUser,
  clearStoredAuthSession,
  getStoredAuthToken,
  getStoredAuthUser,
  setStoredAuthToken,
  setStoredAuthUser,
} from "@/lib/auth-storage";
import {
  AuthContext,
  AuthContextValue,
  LoginInput,
  RegisterInput,
} from "@/contexts/auth-context";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(getStoredAuthUser());
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    const bootstrapAuth = async () => {
      const token = getStoredAuthToken();

      if (!token) {
        setIsLoadingAuth(false);
        return;
      }

      try {
        const currentUser = await authApi.me();
        setStoredAuthUser(currentUser);
        setUser(currentUser);
      } catch (error) {
        clearStoredAuthSession();
        setUser(null);
        setAuthError(
          error instanceof ApiClientError
            ? error.message
            : "Unable to restore your session.",
        );
      } finally {
        setIsLoadingAuth(false);
      }
    };

    void bootstrapAuth();
  }, []);

  const login = async (input: LoginInput) => {
    setAuthError(null);
    setIsLoadingAuth(true);

    try {
      const { token, user: authenticatedUser } = await authApi.login(input);
      setStoredAuthToken(token);
      setStoredAuthUser(authenticatedUser);
      setUser(authenticatedUser);
    } catch (error) {
      clearStoredAuthSession();
      setUser(null);
      setAuthError(
        error instanceof ApiClientError ? error.message : "Login failed.",
      );
      throw error;
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const register = async (input: RegisterInput) => {
    setAuthError(null);
    setIsLoadingAuth(true);

    try {
      const { token, user: authenticatedUser } = await authApi.register(input);
      setStoredAuthToken(token);
      setStoredAuthUser(authenticatedUser);
      setUser(authenticatedUser);
    } catch (error) {
      clearStoredAuthSession();
      setUser(null);
      setAuthError(
        error instanceof ApiClientError
          ? error.message
          : "Registration failed.",
      );
      throw error;
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const logout = () => {
    clearStoredAuthSession();
    setUser(null);
    setAuthError(null);
  };

  const value: AuthContextValue = {
    authError,
    isAuthenticated: Boolean(user),
    isLoadingAuth,
    login,
    logout,
    register,
    user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
