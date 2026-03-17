export type AuthUser = {
  id: string;
  email: string;
  preferredName?: string;
  role: "user" | "admin";
  createdAt: string;
  updatedAt: string;
};

const AUTH_TOKEN_KEY = "auth_token";
const AUTH_USER_KEY = "auth_user";

export const getStoredAuthToken = (): string | null => {
  return localStorage.getItem(AUTH_TOKEN_KEY);
};

export const setStoredAuthToken = (token: string): void => {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
};

export const clearStoredAuthToken = (): void => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
};

export const getStoredAuthUser = (): AuthUser | null => {
  const rawUser = localStorage.getItem(AUTH_USER_KEY);

  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser) as AuthUser;
  } catch {
    clearStoredAuthUser();
    return null;
  }
};

export const setStoredAuthUser = (user: AuthUser): void => {
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
};

export const clearStoredAuthUser = (): void => {
  localStorage.removeItem(AUTH_USER_KEY);
};

export const clearStoredAuthSession = (): void => {
  clearStoredAuthToken();
  clearStoredAuthUser();
};
