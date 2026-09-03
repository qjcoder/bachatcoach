import mongoose from 'mongoose';

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bachatcoach';

/** Reuse one connection across Vercel serverless invocations. */
let cached = globalThis.__bachatcoachMongoose;
if (!cached) {
  cached = globalThis.__bachatcoachMongoose = { conn: null, promise: null };
}

export async function connectDb() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(uri).then((m) => m);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
