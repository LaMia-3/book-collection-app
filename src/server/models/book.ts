import { Collection } from "mongodb";

import { BookPayload } from "../lib/book-payload.js";
import { getMongoDb } from "../lib/mongodb.js";

export const BOOKS_COLLECTION = "books";

export type BookDocument = BookPayload & {
  userId: string;
  createdAt: Date;
  updatedAt: Date;
};

let ensureBookIndexesPromise: Promise<string> | null = null;

export const getBooksCollection = async (): Promise<Collection<BookDocument>> => {
  const db = await getMongoDb();
  return db.collection<BookDocument>(BOOKS_COLLECTION);
};

export const ensureBookIndexes = async (): Promise<void> => {
  if (!ensureBookIndexesPromise) {
    ensureBookIndexesPromise = getBooksCollection().then((collection) =>
      collection.createIndex(
        { userId: 1, id: 1 },
        { unique: true, name: "books_user_id_unique" },
      ),
    );
  }

  await ensureBookIndexesPromise;
};

export const toPublicBook = (
  document: BookDocument,
): BookPayload & {
  createdAt: string;
  updatedAt: string;
} => {
  return {
    id: document.id,
    title: document.title,
    author: document.author,
    genre: document.genre,
    description: document.description,
    publishedDate: document.publishedDate,
    pageCount: document.pageCount,
    thumbnail: document.thumbnail,
    googleBooksId: document.googleBooksId,
    openLibraryId: document.openLibraryId,
    sourceId: document.sourceId,
    sourceType: document.sourceType,
    isbn10: document.isbn10,
    isbn13: document.isbn13,
    status: document.status,
    completedDate: document.completedDate,
    rating: document.rating,
    notes: document.notes,
    progress: document.progress,
    isPartOfSeries: document.isPartOfSeries,
    seriesId: document.seriesId,
    volumeNumber: document.volumeNumber,
    seriesPosition: document.seriesPosition,
    collectionIds: document.collectionIds,
    _legacySeriesName: document._legacySeriesName,
    _legacyNextBookTitle: document._legacyNextBookTitle,
    _legacyNextBookExpectedYear: document._legacyNextBookExpectedYear,
    spineColor: document.spineColor,
    addedDate: document.addedDate,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
  };
};

export const listBooksByUserId = async (
  userId: string,
): Promise<BookDocument[]> => {
  const booksCollection = await getBooksCollection();

  return booksCollection
    .find({ userId })
    .sort({ updatedAt: -1, addedDate: -1 })
    .toArray();
};

export const findBookById = async (
  userId: string,
  id: string,
): Promise<BookDocument | null> => {
  const booksCollection = await getBooksCollection();
  return booksCollection.findOne({ userId, id });
};

export const insertBook = async (
  userId: string,
  payload: BookPayload,
): Promise<BookDocument> => {
  await ensureBookIndexes();

  const booksCollection = await getBooksCollection();
  const now = new Date();
  const bookDocument: BookDocument = {
    ...payload,
    userId,
    createdAt: now,
    updatedAt: now,
  };

  await booksCollection.insertOne(bookDocument);
  return bookDocument;
};

export const updateBook = async (
  userId: string,
  id: string,
  updates: Partial<BookPayload>,
): Promise<BookDocument | null> => {
  const booksCollection = await getBooksCollection();
  const now = new Date();

  const result = await booksCollection.findOneAndUpdate(
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

  return result;
};

export const deleteBook = async (
  userId: string,
  id: string,
): Promise<boolean> => {
  const booksCollection = await getBooksCollection();
  const result = await booksCollection.deleteOne({ userId, id });
  return result.deletedCount === 1;
};
