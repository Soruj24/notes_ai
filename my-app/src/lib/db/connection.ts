import mongoose from "mongoose";

/**
 * Cached MongoDB connection for Next.js (dev HMR-safe via globalThis).
 * Every repository/service calls connectDb() first; components never do.
 */

const DEFAULT_URI = "mongodb://127.0.0.1:27017/notoai";

export function getMongoUri(): string {
  return process.env.MONGODB_URI ?? DEFAULT_URI;
}

interface CachedConnection {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var __notoaiMongoose: CachedConnection | undefined;
}

function getCache(): CachedConnection {
  if (!globalThis.__notoaiMongoose) {
    globalThis.__notoaiMongoose = { conn: null, promise: null };
  }
  return globalThis.__notoaiMongoose;
}

export async function connectDb(): Promise<typeof mongoose> {
  const cache = getCache();
  if (cache.conn) return cache.conn;
  if (!cache.promise) {
    cache.promise = mongoose
      .connect(getMongoUri(), {
        serverSelectionTimeoutMS: 8000,
        maxPoolSize: 10,
      })
      .then((m) => {
        cache.conn = m;
        return m;
      })
      .catch((err: unknown) => {
        cache.promise = null;
        throw err;
      });
  }
  cache.conn = await cache.promise;
  return cache.conn;
}

/** Used by tests/smoke checks to assert the database is reachable. */
export async function pingDb(): Promise<{ ok: boolean; uri: string }> {
  const uri = getMongoUri();
  try {
    const m = await connectDb();
    await m.connection.db?.admin().ping();
    return { ok: true, uri: redactUri(uri) };
  } catch {
    return { ok: false, uri: redactUri(uri) };
  }
}

function redactUri(uri: string): string {
  return uri.replace(/\/\/([^:]+):([^@]+)@/, "//$1:***@");
}
