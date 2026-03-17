import { createContext } from "react";

import { AuthUser } from "@/lib/auth-storage";

export type LoginInput = {
  email: string;
  password: string;
};

export type RegisterInput = LoginInput & {
  preferredName?: string;
};

export type AuthContextValue = {
  authError: string | null;
  changeEmail: (input: {
    currentPassword: string;
    email: string;
  }) => Promise<void>;
  changePreferredName: (input: {
    preferredName?: string;
  }) => Promise<void>;
  changePassword: (input: {
    currentPassword: string;
    newPassword: string;
  }) => Promise<void>;
  deleteAccount: () => Promise<void>;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  login: (input: LoginInput) => Promise<void>;
  logout: () => void;
  register: (input: RegisterInput) => Promise<void>;
  user: AuthUser | null;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
