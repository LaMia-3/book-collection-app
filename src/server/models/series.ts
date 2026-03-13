import { Collection } from "mongodb";

import { SeriesPayload } from "../lib/series-payload.js";
import { getMongoDb } from "../lib/mongodb.js";

export const SERIES_COLLECTION = "series";

export type SeriesDocument = SeriesPayload & {
  userId: string;
  createdAt: Date;
  updatedAt: Date;
};

let ensureSeriesIndexesPromise: Promise<string> | null = null;

export const getSeriesCollection = async (): Promise<Collection<SeriesDocument>> => {
  const db = await getMongoDb();
  return db.collection<SeriesDocument>(SERIES_COLLECTION);
};

export const ensureSeriesIndexes = async (): Promise<void> => {
  if (!ensureSeriesIndexesPromise) {
    ensureSeriesIndexesPromise = getSeriesCollection().then((collection) =>
      collection.createIndex(
        { userId: 1, id: 1 },
        { unique: true, name: "series_user_id_unique" },
      ),
    );
  }

  await ensureSeriesIndexesPromise;
};

export const toPublicSeries = (
  document: SeriesDocument,
): SeriesPayload & {
  createdAt: string;
  updatedAt: string;
} => {
  return {
    id: document.id,
    name: document.name,
    description: document.description,
    author: document.author,
    coverImage: document.coverImage,
    books: document.books,
    totalBooks: document.totalBooks,
    readingOrder: document.readingOrder,
    customOrder: document.customOrder,
    status: document.status,
    genre: document.genre,
    isTracked: document.isTracked,
    hasUpcoming: document.hasUpcoming,
    apiEnriched: document.apiEnriched,
    timestamps: document.timestamps,
    dateAdded: document.dateAdded,
    lastModified: document.lastModified,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
  };
};

export const listSeriesByUserId = async (
  userId: string,
): Promise<SeriesDocument[]> => {
  const seriesCollection = await getSeriesCollection();

  return seriesCollection
    .find({ userId })
    .sort({ updatedAt: -1, dateAdded: -1 })
    .toArray();
};

export const findSeriesById = async (
  userId: string,
  id: string,
): Promise<SeriesDocument | null> => {
  const seriesCollection = await getSeriesCollection();
  return seriesCollection.findOne({ userId, id });
};

export const insertSeries = async (
  userId: string,
  payload: SeriesPayload,
): Promise<SeriesDocument> => {
  await ensureSeriesIndexes();

  const seriesCollection = await getSeriesCollection();
  const now = new Date();
  const seriesDocument: SeriesDocument = {
    ...payload,
    userId,
    createdAt: now,
    updatedAt: now,
  };

  await seriesCollection.insertOne(seriesDocument);
  return seriesDocument;
};

export const updateSeries = async (
  userId: string,
  id: string,
  updates: Partial<SeriesPayload>,
): Promise<SeriesDocument | null> => {
  const seriesCollection = await getSeriesCollection();
  const now = new Date();

  return seriesCollection.findOneAndUpdate(
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

export const deleteSeries = async (
  userId: string,
  id: string,
): Promise<boolean> => {
  const seriesCollection = await getSeriesCollection();
  const result = await seriesCollection.deleteOne({ userId, id });
  return result.deletedCount === 1;
};
