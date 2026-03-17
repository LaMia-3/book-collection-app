import { hashPassword, validateEmail, validatePassword } from "./password.js";
import {
  findUserByEmail,
  insertUser,
  updateUserRoleById,
} from "../models/user.js";

let ensureBootstrapAdminPromise: Promise<void> | null = null;

const getAdminBootstrapCredentials = (): {
  email: string;
  password: string;
} | null => {
  const email = process.env.ADMIN_USER_EMAIL?.trim();
  const password = process.env.ADMIN_USER_PASSWORD?.trim();

  if (!email || !password) {
    return null;
  }

  return {
    email: validateEmail(email),
    password: validatePassword(password),
  };
};

export const ensureBootstrapAdminUser = async (): Promise<void> => {
  if (!ensureBootstrapAdminPromise) {
    ensureBootstrapAdminPromise = (async () => {
      const credentials = getAdminBootstrapCredentials();

      if (!credentials) {
        return;
      }

      const existingUser = await findUserByEmail(credentials.email);

      if (!existingUser?._id) {
        const passwordHash = await hashPassword(credentials.password);
        await insertUser({
          email: credentials.email,
          passwordHash,
          role: "admin",
        });
        return;
      }

      if (existingUser.role !== "admin") {
        await updateUserRoleById(existingUser._id.toString(), "admin");
      }
    })().finally(() => {
      ensureBootstrapAdminPromise = null;
    });
  }

  await ensureBootstrapAdminPromise;
};
