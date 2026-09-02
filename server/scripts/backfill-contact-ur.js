/**
 * Backfill nameUr on existing contacts (no data wipe).
 * Run: npm run backfill:contact-ur
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import Contact from '../src/models/Contact.js';

const NAME_UR = {
  'Ali Hassan': 'علی حسن',
  'Sana Malik': 'ثناء ملک',
  'Usman Ali': 'عثمان علی',
  'Fatima Khan': 'فاطمہ خان',
};

async function backfill() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bachatcoach';
  await mongoose.connect(uri);

  let updated = 0;
  for (const [name, nameUr] of Object.entries(NAME_UR)) {
    const result = await Contact.updateMany(
      { name, $or: [{ nameUr: { $exists: false } }, { nameUr: '' }] },
      { $set: { nameUr } }
    );
    updated += result.modifiedCount;
  }

  console.log(`Updated ${updated} contact(s) with Urdu names.`);
  await mongoose.disconnect();
}

backfill().catch((err) => {
  console.error(err);
  process.exit(1);
});
