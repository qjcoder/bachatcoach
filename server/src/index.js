import 'dotenv/config';
import app from './app.js';
import { connectDb } from './db.js';

const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDb();
  console.log('MongoDB connected');

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BachatCoach API running on port ${PORT}`);
  });
};

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
