import { createHash, randomInt } from "node:crypto";

import { Collection, ObjectId } from "mongodb";

import { getMongoDb } from "../lib/mongodb.js";

export const PASSWORD_RESET_OTPS_COLLECTION = "password_reset_otps";
const PASSWORD_RESET_OTP_TTL_MS = 1000 * 60 * 15;
const PASSWORD_RESET_OTP_MAX_ATTEMPTS = 5;
let ensurePasswordResetOtpIndexesPromise: Promise<string[]> | null = null;

export type PasswordResetOtpDocument = {
  _id?: ObjectId;
  userId: string;
  otpHash: string;
  createdAt: Date;
  expiresAt: Date;
  attemptCount: number;
  maxAttempts: number;
  consumedAt?: Date;
};

type PasswordResetOtpVerificationResult =
  | {
      status: "valid";
      record: PasswordResetOtpDocument & { _id: ObjectId };
    }
  | {
      status: "expired" | "exhausted" | "invalid";
    };

const hashResetOtp = (otp: string): string => {
  return createHash("sha256").update(otp).digest("hex");
};

const generatePasswordResetOtp = (): string => {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
};

export const getPasswordResetOtpsCollection = async (): Promise<
  Collection<PasswordResetOtpDocument>
> => {
  const db = await getMongoDb();
  return db.collection<PasswordResetOtpDocument>(PASSWORD_RESET_OTPS_COLLECTION);
};

export const ensurePasswordResetOtpIndexes = async (): Promise<void> => {
  if (!ensurePasswordResetOtpIndexesPromise) {
    ensurePasswordResetOtpIndexesPromise = getPasswordResetOtpsCollection().then(
      (collection) =>
        collection.createIndexes([
          {
            key: { userId: 1 },
            name: "password_reset_otp_user_id",
          },
          {
            key: { expiresAt: 1 },
            name: "password_reset_otp_expires_at_ttl",
            expireAfterSeconds: 0,
          },
        ]),
    );
  }

  await ensurePasswordResetOtpIndexesPromise;
};

const getLatestActivePasswordResetOtpForUser = async (
  userId: string,
): Promise<(PasswordResetOtpDocument & { _id: ObjectId }) | null> => {
  const collection = await getPasswordResetOtpsCollection();

  return collection.findOne(
    {
      userId,
      consumedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
    },
    {
      sort: {
        createdAt: -1,
      },
    },
  ) as Promise<(PasswordResetOtpDocument & { _id: ObjectId }) | null>;
};

export const invalidatePasswordResetOtpsForUser = async (
  userId: string,
): Promise<void> => {
  const collection = await getPasswordResetOtpsCollection();

  await collection.updateMany(
    {
      userId,
      consumedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
    },
    {
      $set: {
        consumedAt: new Date(),
      },
    },
  );
};

export const createPasswordResetOtp = async (userId: string): Promise<{
  expiresAt: Date;
  otp: string;
}> => {
  await ensurePasswordResetOtpIndexes();
  await invalidatePasswordResetOtpsForUser(userId);

  const collection = await getPasswordResetOtpsCollection();
  const otp = generatePasswordResetOtp();
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + PASSWORD_RESET_OTP_TTL_MS);

  await collection.insertOne({
    userId,
    otpHash: hashResetOtp(otp),
    createdAt,
    expiresAt,
    attemptCount: 0,
    maxAttempts: PASSWORD_RESET_OTP_MAX_ATTEMPTS,
  });

  return {
    otp,
    expiresAt,
  };
};

export const verifyPasswordResetOtp = async (
  userId: string,
  otp: string,
): Promise<PasswordResetOtpVerificationResult> => {
  const collection = await getPasswordResetOtpsCollection();
  const activeOtp = await getLatestActivePasswordResetOtpForUser(userId);

  if (!activeOtp?._id) {
    return { status: "expired" };
  }

  if (activeOtp.attemptCount >= activeOtp.maxAttempts) {
    return { status: "exhausted" };
  }

  if (activeOtp.otpHash !== hashResetOtp(otp)) {
    const nextAttemptCount = activeOtp.attemptCount + 1;
    const exhausted = nextAttemptCount >= activeOtp.maxAttempts;

    await collection.updateOne(
      {
        _id: activeOtp._id,
      },
      {
        $set: {
          attemptCount: nextAttemptCount,
          ...(exhausted ? { consumedAt: new Date() } : {}),
        },
      },
    );

    return { status: exhausted ? "exhausted" : "invalid" };
  }

  return {
    status: "valid",
    record: activeOtp,
  };
};

export const consumePasswordResetOtp = async (id: ObjectId): Promise<void> => {
  const collection = await getPasswordResetOtpsCollection();

  await collection.updateOne(
    { _id: id },
    {
      $set: {
        consumedAt: new Date(),
      },
    },
  );
};
