import { Collection } from "mongodb";

import { UserSettingsPayload } from "../lib/user-settings-payload.js";
import { getMongoDb } from "../lib/mongodb.js";

export const USER_SETTINGS_COLLECTION = "user_settings";

export type UserSettingsDocument = UserSettingsPayload & {
  userId: string;
  createdAt: Date;
  updatedAt: Date;
};

let ensureUserSettingsIndexesPromise: Promise<string> | null = null;

export const getUserSettingsCollection = async (): Promise<Collection<UserSettingsDocument>> => {
  const db = await getMongoDb();
  return db.collection<UserSettingsDocument>(USER_SETTINGS_COLLECTION);
};

export const ensureUserSettingsIndexes = async (): Promise<void> => {
  if (!ensureUserSettingsIndexesPromise) {
    ensureUserSettingsIndexesPromise = getUserSettingsCollection().then((collection) =>
      collection.createIndex(
        { userId: 1 },
        { unique: true, name: "user_settings_user_id_unique" },
      ),
    );
  }

  await ensureUserSettingsIndexesPromise;
};

export const toPublicUserSettings = (
  document: UserSettingsDocument,
): UserSettingsPayload => ({
  preferredName: document.preferredName,
  birthday: document.birthday,
  celebrateBirthday: document.celebrateBirthday,
  defaultView: document.defaultView,
  defaultApi: document.defaultApi,
  defaultStatus: document.defaultStatus,
  goals: document.goals,
  displayOptions: document.displayOptions,
  notifications: document.notifications,
});

export const findUserSettingsByUserId = async (
  userId: string,
): Promise<UserSettingsDocument | null> => {
  const settingsCollection = await getUserSettingsCollection();
  return settingsCollection.findOne({ userId });
};

export const upsertUserSettings = async (
  userId: string,
  updates: UserSettingsPayload,
): Promise<UserSettingsDocument> => {
  await ensureUserSettingsIndexes();

  const settingsCollection = await getUserSettingsCollection();
  const existingSettings = await findUserSettingsByUserId(userId);
  const now = new Date();

  const nextSettings: UserSettingsDocument = {
    ...(existingSettings || {}),
    ...updates,
    userId,
    createdAt: existingSettings?.createdAt || now,
    updatedAt: now,
  };

  await settingsCollection.updateOne(
    { userId },
    {
      $set: nextSettings,
    },
    { upsert: true },
  );

  return nextSettings;
};
