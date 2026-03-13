import { Collection } from "mongodb";

import { CollectionPayload } from "../lib/collection-payload.js";
import { getMongoDb } from "../lib/mongodb.js";

export const COLLECTIONS_COLLECTION = "collections";

export type CollectionDocument = CollectionPayload & {
  userId: string;
  createdAtDate: Date;
  updatedAtDate: Date;
};

let ensureCollectionIndexesPromise: Promise<string> | null = null;

export const getCollectionsCollection = async (): Promise<Collection<CollectionDocument>> => {
  const db = await getMongoDb();
  return db.collection<CollectionDocument>(COLLECTIONS_COLLECTION);
};

export const ensureCollectionIndexes = async (): Promise<void> => {
  if (!ensureCollectionIndexesPromise) {
    ensureCollectionIndexesPromise = getCollectionsCollection().then((collection) =>
      collection.createIndex(
        { userId: 1, id: 1 },
        { unique: true, name: "collections_user_id_unique" },
      ),
    );
  }

  await ensureCollectionIndexesPromise;
};

export const toPublicCollection = (document: CollectionDocument): CollectionPayload => ({
  id: document.id,
  name: document.name,
  description: document.description,
  bookIds: document.bookIds,
  color: document.color,
  imageUrl: document.imageUrl,
  createdAt: document.createdAt,
  updatedAt: document.updatedAt,
});

export const listCollectionsByUserId = async (
  userId: string,
): Promise<CollectionDocument[]> => {
  const collectionsCollection = await getCollectionsCollection();

  return collectionsCollection
    .find({ userId })
    .sort({ updatedAtDate: -1, createdAtDate: -1 })
    .toArray();
};

export const findCollectionById = async (
  userId: string,
  id: string,
): Promise<CollectionDocument | null> => {
  const collectionsCollection = await getCollectionsCollection();
  return collectionsCollection.findOne({ userId, id });
};

export const insertCollection = async (
  userId: string,
  payload: CollectionPayload,
): Promise<CollectionDocument> => {
  await ensureCollectionIndexes();

  const collectionsCollection = await getCollectionsCollection();
  const collectionDocument: CollectionDocument = {
    ...payload,
    userId,
    createdAtDate: new Date(payload.createdAt),
    updatedAtDate: new Date(payload.updatedAt),
  };

  await collectionsCollection.insertOne(collectionDocument);
  return collectionDocument;
};

export const updateCollection = async (
  userId: string,
  id: string,
  updates: Partial<CollectionPayload>,
): Promise<CollectionDocument | null> => {
  const collectionsCollection = await getCollectionsCollection();
  const updatedAt = updates.updatedAt || new Date().toISOString();

  return collectionsCollection.findOneAndUpdate(
    { userId, id },
    {
      $set: {
        ...updates,
        updatedAt,
        updatedAtDate: new Date(updatedAt),
        ...(updates.createdAt ? { createdAtDate: new Date(updates.createdAt) } : {}),
      },
    },
    {
      returnDocument: "after",
    },
  );
};

export const deleteCollection = async (
  userId: string,
  id: string,
): Promise<boolean> => {
  const collectionsCollection = await getCollectionsCollection();
  const result = await collectionsCollection.deleteOne({ userId, id });
  return result.deletedCount === 1;
};
