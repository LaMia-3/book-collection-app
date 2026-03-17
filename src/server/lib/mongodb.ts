import { Db, MongoClient, MongoClientOptions, ServerApiVersion } from "mongodb";

type MongoCache = {
  client: MongoClient | null;
  promise: Promise<MongoClient> | null;
};

declare global {
  // Cache the driver client across module reloads in development and warm serverless invocations.
  let __mongoCache__: MongoCache | undefined;
}

const options: MongoClientOptions = {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
};

const getMongoUri = (): string => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("Missing MONGODB_URI environment variable.");
  }

  return uri;
};

const mongoCache = globalThis.__mongoCache__ ?? {
  client: null,
  promise: null,
};

globalThis.__mongoCache__ = mongoCache;

export const getMongoClient = async (): Promise<MongoClient> => {
  if (mongoCache.client) {
    return mongoCache.client;
  }

  if (!mongoCache.promise) {
    mongoCache.promise = new MongoClient(getMongoUri(), options).connect();
  }

  mongoCache.client = await mongoCache.promise;
  return mongoCache.client;
};

export const getMongoDb = async (dbName?: string): Promise<Db> => {
  const client = await getMongoClient();
  return client.db(dbName);
};

export const resetMongoConnectionForTests = async (): Promise<void> => {
  if (!mongoCache.client) {
    mongoCache.promise = null;
    return;
  }

  await mongoCache.client.close();
  mongoCache.client = null;
  mongoCache.promise = null;
};
