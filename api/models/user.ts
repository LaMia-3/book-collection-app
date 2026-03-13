import { Collection, ObjectId } from "mongodb";

import { getMongoDb } from "../lib/mongodb";

export const USERS_COLLECTION = "users";
let ensureUserIndexesPromise: Promise<string> | null = null;

export type UserDocument = {
  _id?: ObjectId;
  email: string;
  passwordHash: string;
  preferredName?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type PublicUser = {
  id: string;
  email: string;
  preferredName?: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateUserInput = {
  email: string;
  passwordHash: string;
  preferredName?: string;
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
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
};
