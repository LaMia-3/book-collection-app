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
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  login: (input: LoginInput) => Promise<void>;
  logout: () => void;
  register: (input: RegisterInput) => Promise<void>;
  user: AuthUser | null;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
