import { Collection, ObjectId } from "mongodb";

import { getMongoDb } from "../lib/mongodb.js";

export const USER_ANNOUNCEMENT_STATES_COLLECTION = "user_announcement_states";
let ensureUserAnnouncementStateIndexesPromise: Promise<string[]> | null = null;

export type UserAnnouncementStateDocument = {
  _id?: ObjectId;
  userId: string;
  announcementId: string;
  seenAt?: Date;
  dismissedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

export const getUserAnnouncementStatesCollection = async (): Promise<
  Collection<UserAnnouncementStateDocument>
> => {
  const db = await getMongoDb();
  return db.collection<UserAnnouncementStateDocument>(
    USER_ANNOUNCEMENT_STATES_COLLECTION,
  );
};

export const ensureUserAnnouncementStateIndexes = async (): Promise<void> => {
  if (!ensureUserAnnouncementStateIndexesPromise) {
    ensureUserAnnouncementStateIndexesPromise =
      getUserAnnouncementStatesCollection().then((collection) =>
        Promise.all([
          collection.createIndex(
            { userId: 1, announcementId: 1 },
            {
              unique: true,
              name: "user_announcement_states_user_announcement_unique",
            },
          ),
          collection.createIndex(
            { userId: 1, updatedAt: -1 },
            { name: "user_announcement_states_user_updated_at" },
          ),
        ]),
      );
  }

  await ensureUserAnnouncementStateIndexesPromise;
};

export const getUserAnnouncementStates = async (
  userId: string,
  announcementIds: string[],
): Promise<UserAnnouncementStateDocument[]> => {
  if (announcementIds.length === 0) {
    return [];
  }

  await ensureUserAnnouncementStateIndexes();
  const collection = await getUserAnnouncementStatesCollection();

  return collection.find({ userId, announcementId: { $in: announcementIds } }).toArray();
};

export const markAnnouncementSeen = async (
  userId: string,
  announcementId: string,
): Promise<void> => {
  await ensureUserAnnouncementStateIndexes();
  const collection = await getUserAnnouncementStatesCollection();
  const existing = await collection.findOne({ userId, announcementId });
  const now = new Date();

  if (!existing) {
    await collection.insertOne({
      userId,
      announcementId,
      seenAt: now,
      createdAt: now,
      updatedAt: now,
    });
    return;
  }

  if (existing.seenAt) {
    await collection.updateOne(
      { _id: existing._id },
      { $set: { updatedAt: now } },
    );
    return;
  }

  await collection.updateOne(
    { _id: existing._id },
    {
      $set: {
        seenAt: now,
        updatedAt: now,
      },
    },
  );
};

export const dismissAnnouncement = async (
  userId: string,
  announcementId: string,
): Promise<void> => {
  await ensureUserAnnouncementStateIndexes();
  const collection = await getUserAnnouncementStatesCollection();
  const existing = await collection.findOne({ userId, announcementId });
  const now = new Date();

  if (!existing) {
    await collection.insertOne({
      userId,
      announcementId,
      seenAt: now,
      dismissedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    return;
  }

  await collection.updateOne(
    { _id: existing._id },
    {
      $set: {
        seenAt: existing.seenAt || now,
        dismissedAt: now,
        updatedAt: now,
      },
    },
  );
};

export const getAnnouncementStateCounts = async (
  announcementIds: string[],
): Promise<Record<string, { seenCount: number; dismissedCount: number }>> => {
  if (announcementIds.length === 0) {
    return {};
  }

  await ensureUserAnnouncementStateIndexes();
  const collection = await getUserAnnouncementStatesCollection();
  const rows = await collection
    .aggregate<{
      _id: string;
      seenCount: number;
      dismissedCount: number;
    }>([
      {
        $match: {
          announcementId: { $in: announcementIds },
        },
      },
      {
        $group: {
          _id: "$announcementId",
          seenCount: {
            $sum: {
              $cond: [{ $ifNull: ["$seenAt", false] }, 1, 0],
            },
          },
          dismissedCount: {
            $sum: {
              $cond: [{ $ifNull: ["$dismissedAt", false] }, 1, 0],
            },
          },
        },
      },
    ])
    .toArray();

  return Object.fromEntries(
    rows.map((row) => [
      row._id,
      {
        seenCount: row.seenCount,
        dismissedCount: row.dismissedCount,
      },
    ]),
  );
};
