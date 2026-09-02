/**
 * Backfill nameUr on existing users (no data wipe).
 * Run: npm run backfill:user-ur
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../src/models/User.js';

const NAME_UR = {
  'Ahmed Khan': 'احمد خان',
};

async function backfill() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bachatcoach';
  await mongoose.connect(uri);

  let updated = 0;
  for (const [name, nameUr] of Object.entries(NAME_UR)) {
    const result = await User.updateMany(
      { name, $or: [{ nameUr: { $exists: false } }, { nameUr: '' }] },
      { $set: { nameUr } }
    );
    updated += result.modifiedCount;
  }

  console.log(`Updated ${updated} user(s) with Urdu names.`);
  await mongoose.disconnect();
}

backfill().catch((err) => {
  console.error(err);
  process.exit(1);
});
