import { Collection } from "mongodb";

import { NotificationPayload } from "../lib/notification-payload.js";
import { getMongoDb } from "../lib/mongodb.js";

export const NOTIFICATIONS_COLLECTION = "notifications";

export type NotificationDocument = NotificationPayload & {
  userId: string;
  updatedAt: Date;
};

let ensureNotificationIndexesPromise: Promise<string> | null = null;

export const getNotificationsCollection = async (): Promise<
  Collection<NotificationDocument>
> => {
  const db = await getMongoDb();
  return db.collection<NotificationDocument>(NOTIFICATIONS_COLLECTION);
};

export const ensureNotificationIndexes = async (): Promise<void> => {
  if (!ensureNotificationIndexesPromise) {
    ensureNotificationIndexesPromise = getNotificationsCollection().then((collection) =>
      collection.createIndex(
        { userId: 1, id: 1 },
        { unique: true, name: "notifications_user_id_unique" },
      ),
    );
  }

  await ensureNotificationIndexesPromise;
};

export const toPublicNotification = (
  document: NotificationDocument,
): NotificationPayload & {
  updatedAt: string;
} => ({
  id: document.id,
  title: document.title,
  message: document.message,
  type: document.type,
  createdAt: document.createdAt,
  isRead: document.isRead,
  isDismissed: document.isDismissed,
  seriesId: document.seriesId,
  bookId: document.bookId,
  actionUrl: document.actionUrl,
  updatedAt: document.updatedAt.toISOString(),
});

export const listNotificationsByUserId = async (
  userId: string,
): Promise<NotificationDocument[]> => {
  const collection = await getNotificationsCollection();
  return collection.find({ userId }).sort({ createdAt: -1, updatedAt: -1 }).toArray();
};

export const findNotificationById = async (
  userId: string,
  id: string,
): Promise<NotificationDocument | null> => {
  const collection = await getNotificationsCollection();
  return collection.findOne({ userId, id });
};

export const insertNotification = async (
  userId: string,
  payload: NotificationPayload,
): Promise<NotificationDocument> => {
  await ensureNotificationIndexes();

  const collection = await getNotificationsCollection();
  const now = new Date();
  const document: NotificationDocument = {
    ...payload,
    userId,
    updatedAt: now,
  };

  await collection.insertOne(document);
  return document;
};

export const updateNotification = async (
  userId: string,
  id: string,
  updates: Partial<NotificationPayload>,
): Promise<NotificationDocument | null> => {
  const collection = await getNotificationsCollection();
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

export const deleteNotification = async (
  userId: string,
  id: string,
): Promise<boolean> => {
  const collection = await getNotificationsCollection();
  const result = await collection.deleteOne({ userId, id });
  return result.deletedCount === 1;
};
