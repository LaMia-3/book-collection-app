import { Collection, ObjectId } from "mongodb";

import { getMongoDb } from "../lib/mongodb.js";

export const USERS_COLLECTION = "users";
let ensureUserIndexesPromise: Promise<string> | null = null;
export type UserRole = "user" | "admin";

export type UserDocument = {
  _id?: ObjectId;
  email: string;
  passwordHash: string;
  preferredName?: string;
  role?: UserRole;
  createdAt: Date;
  sessionInvalidBefore?: Date;
  updatedAt: Date;
};

export type PublicUser = {
  id: string;
  email: string;
  preferredName?: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
};

export type CreateUserInput = {
  email: string;
  passwordHash: string;
  preferredName?: string;
  role?: UserRole;
};

export const normalizeUserEmail = (email: string): string =>
  email.trim().toLowerCase();

export const getUsersCollection = async (): Promise<Collection<UserDocument>> => {
  const db = await getMongoDb();
  return db.collection<UserDocument>(USERS_COLLECTION);
};

export const ensureUserIndexes = async (): Promise<void> => {
  if (!ensureUserIndexesPromise) {
    ensureUserIndexesPromise = getUsersCollection().then((collection) =>
      collection.createIndex({ email: 1 }, { unique: true, name: "users_email_unique" }),
    );
  }

  await ensureUserIndexesPromise;
};

export const findUserByEmail = async (
  email: string,
): Promise<UserDocument | null> => {
  const usersCollection = await getUsersCollection();
  return usersCollection.findOne({ email: normalizeUserEmail(email) });
};

export const findUserById = async (
  id: string,
): Promise<UserDocument | null> => {
  if (!ObjectId.isValid(id)) {
    return null;
  }

  const usersCollection = await getUsersCollection();
  return usersCollection.findOne({ _id: new ObjectId(id) });
};

export const deleteUserById = async (id: string): Promise<boolean> => {
  if (!ObjectId.isValid(id)) {
    return false;
  }

  const usersCollection = await getUsersCollection();
  const result = await usersCollection.deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount === 1;
};

export const updateUserPasswordById = async (
  id: string,
  passwordHash: string,
): Promise<boolean> => {
  if (!ObjectId.isValid(id)) {
    return false;
  }

  const usersCollection = await getUsersCollection();
  const result = await usersCollection.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        passwordHash,
        sessionInvalidBefore: new Date(),
        updatedAt: new Date(),
      },
    },
  );

  return result.matchedCount === 1;
};

export const updateUserEmailById = async (
  id: string,
  email: string,
): Promise<UserDocument | null> => {
  if (!ObjectId.isValid(id)) {
    return null;
  }

  await ensureUserIndexes();

  const usersCollection = await getUsersCollection();
  const normalizedEmail = normalizeUserEmail(email);
  const result = await usersCollection.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        email: normalizedEmail,
        updatedAt: new Date(),
      },
    },
  );

  if (result.matchedCount !== 1) {
    return null;
  }

  return findUserById(id);
};

export const updateUserRoleById = async (
  id: string,
  role: UserRole,
): Promise<UserDocument | null> => {
  if (!ObjectId.isValid(id)) {
    return null;
  }

  const usersCollection = await getUsersCollection();
  const result = await usersCollection.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        role,
        updatedAt: new Date(),
      },
    },
  );

  if (result.matchedCount !== 1) {
    return null;
  }

  return findUserById(id);
};

export const invalidateUserSessionsById = async (id: string): Promise<boolean> => {
  if (!ObjectId.isValid(id)) {
    return false;
  }

  const usersCollection = await getUsersCollection();
  const result = await usersCollection.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        sessionInvalidBefore: new Date(),
        updatedAt: new Date(),
      },
    },
  );

  return result.matchedCount === 1;
};

export const insertUser = async (
  input: CreateUserInput,
): Promise<UserDocument> => {
  await ensureUserIndexes();

  const usersCollection = await getUsersCollection();
  const userDocument = createUserDocument(input);
  const result = await usersCollection.insertOne(userDocument);

  return {
    ...userDocument,
    _id: result.insertedId,
  };
};

export const createUserDocument = ({
  email,
  passwordHash,
  preferredName,
}: CreateUserInput): UserDocument => {
  const now = new Date();

  return {
    email: normalizeUserEmail(email),
    passwordHash,
    preferredName: preferredName?.trim() || undefined,
    role: role || "user",
    createdAt: now,
    updatedAt: now,
  };
};

export const toPublicUser = (user: UserDocument): PublicUser => {
  if (!user._id) {
    throw new Error("User document is missing _id.");
  }

  return {
    id: user._id.toString(),
    email: user.email,
    preferredName: user.preferredName,
    role: user.role || "user",
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
};
