import { Collection } from "mongodb";

import { UpcomingReleasePayload } from "../lib/upcoming-release-payload.js";
import { getMongoDb } from "../lib/mongodb.js";

export const UPCOMING_RELEASES_COLLECTION = "upcoming_releases";

export type UpcomingReleaseDocument = UpcomingReleasePayload & {
  userId: string;
  createdAt: Date;
  updatedAt: Date;
};

let ensureUpcomingReleaseIndexesPromise: Promise<string> | null = null;

export const getUpcomingReleasesCollection = async (): Promise<
  Collection<UpcomingReleaseDocument>
> => {
  const db = await getMongoDb();
  return db.collection<UpcomingReleaseDocument>(UPCOMING_RELEASES_COLLECTION);
};

export const ensureUpcomingReleaseIndexes = async (): Promise<void> => {
  if (!ensureUpcomingReleaseIndexesPromise) {
    ensureUpcomingReleaseIndexesPromise = getUpcomingReleasesCollection().then((collection) =>
      collection.createIndex(
        { userId: 1, id: 1 },
        { unique: true, name: "upcoming_releases_user_id_unique" },
      ),
    );
  }

  await ensureUpcomingReleaseIndexesPromise;
};

export const toPublicUpcomingRelease = (
  document: UpcomingReleaseDocument,
): UpcomingReleasePayload & {
  createdAt: string;
  updatedAt: string;
} => ({
  id: document.id,
  title: document.title,
  seriesId: document.seriesId,
  seriesName: document.seriesName,
  volumeNumber: document.volumeNumber,
  author: document.author,
  expectedReleaseDate: document.expectedReleaseDate,
  coverImageUrl: document.coverImageUrl,
  preOrderLink: document.preOrderLink,
  synopsis: document.synopsis,
  isUserContributed: document.isUserContributed,
  amazonProductId: document.amazonProductId,
  createdAt: document.createdAt.toISOString(),
  updatedAt: document.updatedAt.toISOString(),
});

export const listUpcomingReleasesByUserId = async (
  userId: string,
): Promise<UpcomingReleaseDocument[]> => {
  const collection = await getUpcomingReleasesCollection();
  return collection.find({ userId }).sort({ updatedAt: -1, createdAt: -1 }).toArray();
};

export const findUpcomingReleaseById = async (
  userId: string,
  id: string,
): Promise<UpcomingReleaseDocument | null> => {
  const collection = await getUpcomingReleasesCollection();
  return collection.findOne({ userId, id });
};

export const insertUpcomingRelease = async (
  userId: string,
  payload: UpcomingReleasePayload,
): Promise<UpcomingReleaseDocument> => {
  await ensureUpcomingReleaseIndexes();

  const collection = await getUpcomingReleasesCollection();
  const now = new Date();
  const document: UpcomingReleaseDocument = {
    ...payload,
    userId,
    createdAt: now,
    updatedAt: now,
  };

  await collection.insertOne(document);
  return document;
};

export const updateUpcomingRelease = async (
  userId: string,
  id: string,
  updates: Partial<UpcomingReleasePayload>,
): Promise<UpcomingReleaseDocument | null> => {
  const collection = await getUpcomingReleasesCollection();
  const now = new Date();

  return collection.findOneAndUpdate(
    { userId, id },
    {
      $set: {
        ...updates,
        updatedAt: now,
      },
    },
    {
      returnDocument: "after",
    },
  );
};

export const deleteUpcomingRelease = async (
  userId: string,
  id: string,
): Promise<boolean> => {
  const collection = await getUpcomingReleasesCollection();
  const result = await collection.deleteOne({ userId, id });
  return result.deletedCount === 1;
};
