import mongoose from 'mongoose';

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bachatcoach';

/** Reuse one connection across Vercel serverless invocations. */
let cached = globalThis.__bachatcoachMongoose;
if (!cached) {
  cached = globalThis.__bachatcoachMongoose = { conn: null, promise: null };
}

/**
 * Tiny pool for Atlas M0 + Vercel: avoid connection storms that throttle free clusters.
 */
const connectOptions = {
  maxPoolSize: 1,
  minPoolSize: 0,
  maxIdleTimeMS: 10_000,
  serverSelectionTimeoutMS: 8_000,
  socketTimeoutMS: 20_000,
};

export async function connectDb() {
  if (cached.conn) {
    if (mongoose.connection.readyState === 1) return cached.conn;
    cached.conn = null;
    cached.promise = null;
  }
  if (!cached.promise) {
    cached.promise = mongoose.connect(uri, connectOptions).then((m) => m);
  }
  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    throw err;
  }
  return cached.conn;
}
