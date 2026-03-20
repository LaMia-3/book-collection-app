import { Collection, ObjectId } from "mongodb";

import { getMongoDb } from "../lib/mongodb";

export const SYSTEM_ANNOUNCEMENTS_COLLECTION = "system_announcements";
let ensureSystemAnnouncementIndexesPromise: Promise<string[]> | null = null;

export type SystemAnnouncementKind =
  | "release"
  | "maintenance"
  | "warning"
  | "feature";

export type SystemAnnouncementSeverity =
  | "info"
  | "success"
  | "warning"
  | "critical";

export type SystemAnnouncementEnvironment = "all" | "preview" | "production";

export type SystemAnnouncementDocument = {
  _id?: ObjectId;
  title: string;
  body: string;
  kind: SystemAnnouncementKind;
  severity: SystemAnnouncementSeverity;
  isActive: boolean;
  startsAt?: Date;
  endsAt?: Date;
  minAppVersion?: string;
  maxAppVersion?: string;
  environment: SystemAnnouncementEnvironment;
  ctaLabel?: string;
  ctaUrl?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type PublicSystemAnnouncement = {
  id: string;
  title: string;
  body: string;
  kind: SystemAnnouncementKind;
  severity: SystemAnnouncementSeverity;
  isActive: boolean;
  startsAt?: string;
  endsAt?: string;
  minAppVersion?: string;
  maxAppVersion?: string;
  environment: SystemAnnouncementEnvironment;
  ctaLabel?: string;
  ctaUrl?: string;
  createdAt: string;
  updatedAt: string;
};

export type SystemAnnouncementInput = {
  title: string;
  body: string;
  kind: SystemAnnouncementKind;
  severity: SystemAnnouncementSeverity;
  isActive: boolean;
  startsAt?: Date;
  endsAt?: Date;
  minAppVersion?: string;
  maxAppVersion?: string;
  environment: SystemAnnouncementEnvironment;
  ctaLabel?: string;
  ctaUrl?: string;
};

export const getSystemAnnouncementsCollection = async (): Promise<
  Collection<SystemAnnouncementDocument>
> => {
  const db = await getMongoDb();
  return db.collection<SystemAnnouncementDocument>(
    SYSTEM_ANNOUNCEMENTS_COLLECTION,
  );
};

export const ensureSystemAnnouncementIndexes = async (): Promise<void> => {
  if (!ensureSystemAnnouncementIndexesPromise) {
    ensureSystemAnnouncementIndexesPromise =
      getSystemAnnouncementsCollection().then((collection) =>
        Promise.all([
          collection.createIndex(
            { isActive: 1, environment: 1, startsAt: 1, endsAt: 1 },
            { name: "system_announcements_active_environment_window" },
          ),
          collection.createIndex(
            { createdAt: -1 },
            { name: "system_announcements_created_at_desc" },
          ),
        ]),
      );
  }

  await ensureSystemAnnouncementIndexesPromise;
};

export const findSystemAnnouncementById = async (
  id: string,
): Promise<SystemAnnouncementDocument | null> => {
  if (!ObjectId.isValid(id)) {
    return null;
  }

  const collection = await getSystemAnnouncementsCollection();
  return collection.findOne({ _id: new ObjectId(id) });
};

export const listAllSystemAnnouncements = async (): Promise<
  SystemAnnouncementDocument[]
> => {
  await ensureSystemAnnouncementIndexes();

  const collection = await getSystemAnnouncementsCollection();
  return collection.find({}, { sort: { createdAt: -1 } }).toArray();
};

export const insertSystemAnnouncement = async (
  input: SystemAnnouncementInput,
): Promise<SystemAnnouncementDocument> => {
  await ensureSystemAnnouncementIndexes();

  const collection = await getSystemAnnouncementsCollection();
  const now = new Date();
  const document: SystemAnnouncementDocument = {
    ...input,
    createdAt: now,
    updatedAt: now,
  };

  const result = await collection.insertOne(document);

  return {
    ...document,
    _id: result.insertedId,
  };
};

export const updateSystemAnnouncementById = async (
  id: string,
  update: Partial<SystemAnnouncementInput>,
): Promise<SystemAnnouncementDocument | null> => {
  if (!ObjectId.isValid(id)) {
    return null;
  }

  const collection = await getSystemAnnouncementsCollection();
  const result = await collection.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        ...update,
        updatedAt: new Date(),
      },
    },
  );

  if (result.matchedCount !== 1) {
    return null;
  }

  return findSystemAnnouncementById(id);
};

export const deleteSystemAnnouncementById = async (
  id: string,
): Promise<boolean> => {
  if (!ObjectId.isValid(id)) {
    return false;
  }

  const collection = await getSystemAnnouncementsCollection();
  const result = await collection.deleteOne({ _id: new ObjectId(id) });

  return result.deletedCount === 1;
};

const normalizeVersionPart = (value: string | undefined): number => {
  const parsed = Number.parseInt(value || "0", 10);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const compareAppVersions = (left: string, right: string): number => {
  const leftParts = left.split(".");
  const rightParts = right.split(".");
  const totalParts = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < totalParts; index += 1) {
    const leftValue = normalizeVersionPart(leftParts[index]);
    const rightValue = normalizeVersionPart(rightParts[index]);

    if (leftValue !== rightValue) {
      return leftValue - rightValue;
    }
  }

  return 0;
};

const matchesAppVersion = (
  announcement: SystemAnnouncementDocument,
  appVersion: string,
): boolean => {
  if (
    announcement.minAppVersion &&
    compareAppVersions(appVersion, announcement.minAppVersion) < 0
  ) {
    return false;
  }

  if (
    announcement.maxAppVersion &&
    compareAppVersions(appVersion, announcement.maxAppVersion) > 0
  ) {
    return false;
  }

  return true;
};

export const listActiveSystemAnnouncements = async ({
  appVersion,
  environment,
  now = new Date(),
}: {
  appVersion: string;
  environment: SystemAnnouncementEnvironment;
  now?: Date;
}): Promise<SystemAnnouncementDocument[]> => {
  await ensureSystemAnnouncementIndexes();

  const collection = await getSystemAnnouncementsCollection();
  const announcements = await collection
    .find({
      isActive: true,
      environment: { $in: ["all", environment] },
      $and: [
        {
          $or: [{ startsAt: { $exists: false } }, { startsAt: null }, { startsAt: { $lte: now } }],
        },
        {
          $or: [{ endsAt: { $exists: false } }, { endsAt: null }, { endsAt: { $gte: now } }],
        },
      ],
    })
    .sort({ createdAt: -1 })
    .toArray();

  return announcements.filter((announcement) =>
    matchesAppVersion(announcement, appVersion),
  );
};

export const toPublicSystemAnnouncement = (
  announcement: SystemAnnouncementDocument,
): PublicSystemAnnouncement => {
  if (!announcement._id) {
    throw new Error("System announcement is missing _id.");
  }

  return {
    id: announcement._id.toString(),
    title: announcement.title,
    body: announcement.body,
    kind: announcement.kind,
    severity: announcement.severity,
    isActive: announcement.isActive,
    startsAt: announcement.startsAt?.toISOString(),
    endsAt: announcement.endsAt?.toISOString(),
    minAppVersion: announcement.minAppVersion,
    maxAppVersion: announcement.maxAppVersion,
    environment: announcement.environment,
    ctaLabel: announcement.ctaLabel,
    ctaUrl: announcement.ctaUrl,
    createdAt: announcement.createdAt.toISOString(),
    updatedAt: announcement.updatedAt.toISOString(),
  };
};
