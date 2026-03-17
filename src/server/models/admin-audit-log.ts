import { Collection, ObjectId } from "mongodb";

import { getMongoDb } from "../lib/mongodb.js";

export const ADMIN_AUDIT_LOGS_COLLECTION = "admin_audit_logs";
let ensureAdminAuditLogIndexesPromise: Promise<string[]> | null = null;

export type AdminAuditAction =
  | "admin.user.promoted"
  | "admin.user.demoted"
  | "admin.user.password_reset"
  | "admin.user.deleted";

export type AdminAuditLogDocument = {
  _id?: ObjectId;
  actorUserId: string;
  actorEmail: string;
  action: AdminAuditAction;
  targetUserId?: string;
  targetUserEmail?: string;
  details?: Record<string, unknown>;
  createdAt: Date;
};

export type AdminAuditLogEntry = {
  id: string;
  actorUserId: string;
  actorEmail: string;
  action: AdminAuditAction;
  targetUserId?: string;
  targetUserEmail?: string;
  details?: Record<string, unknown>;
  createdAt: string;
};

export type CreateAdminAuditLogInput = {
  actorUserId: string;
  actorEmail: string;
  action: AdminAuditAction;
  targetUserId?: string;
  targetUserEmail?: string;
  details?: Record<string, unknown>;
};

export const getAdminAuditLogsCollection = async (): Promise<
  Collection<AdminAuditLogDocument>
> => {
  const db = await getMongoDb();
  return db.collection<AdminAuditLogDocument>(ADMIN_AUDIT_LOGS_COLLECTION);
};

export const ensureAdminAuditLogIndexes = async (): Promise<void> => {
  if (!ensureAdminAuditLogIndexesPromise) {
    ensureAdminAuditLogIndexesPromise = getAdminAuditLogsCollection().then(
      (collection) =>
        Promise.all([
          collection.createIndex(
            { createdAt: -1 },
            { name: "admin_audit_logs_created_at_desc" },
          ),
          collection.createIndex(
            { actorUserId: 1, createdAt: -1 },
            { name: "admin_audit_logs_actor_created_at" },
          ),
          collection.createIndex(
            { targetUserId: 1, createdAt: -1 },
            { name: "admin_audit_logs_target_created_at" },
          ),
        ]),
    );
  }

  await ensureAdminAuditLogIndexesPromise;
};

export const createAdminAuditLog = async (
  input: CreateAdminAuditLogInput,
): Promise<AdminAuditLogDocument> => {
  await ensureAdminAuditLogIndexes();

  const collection = await getAdminAuditLogsCollection();
  const document: AdminAuditLogDocument = {
    actorUserId: input.actorUserId,
    actorEmail: input.actorEmail,
    action: input.action,
    targetUserId: input.targetUserId,
    targetUserEmail: input.targetUserEmail,
    details: input.details,
    createdAt: new Date(),
  };

  const result = await collection.insertOne(document);

  return {
    ...document,
    _id: result.insertedId,
  };
};

export const listAdminAuditLogs = async (
  limit = 100,
): Promise<AdminAuditLogDocument[]> => {
  const collection = await getAdminAuditLogsCollection();
  return collection
    .find({}, { sort: { createdAt: -1 }, limit })
    .toArray();
};

export const toAdminAuditLogEntry = (
  log: AdminAuditLogDocument,
): AdminAuditLogEntry => {
  if (!log._id) {
    throw new Error("Admin audit log is missing _id.");
  }

  return {
    id: log._id.toString(),
    actorUserId: log.actorUserId,
    actorEmail: log.actorEmail,
    action: log.action,
    targetUserId: log.targetUserId,
    targetUserEmail: log.targetUserEmail,
    details: log.details,
    createdAt: log.createdAt.toISOString(),
  };
};
