import express from 'express';
import cors from 'cors';
import { connectDb } from './db.js';
import authRoutes from './routes/auth.js';
import transactionRoutes from './routes/transactions.js';
import contactRoutes from './routes/contacts.js';
import goalRoutes from './routes/goals.js';
import dashboardRoutes from './routes/dashboard.js';
import backupRoutes from './routes/backup.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '4.5mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', app: 'BachatCoach API' });
});

app.use(async (_req, _res, next) => {
  try {
    await connectDb();
    next();
  } catch (err) {
    next(err);
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/backup', backupRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Server error' });
});

export default app;
