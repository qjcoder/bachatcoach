import express from 'express';
import cors from 'cors';
import { connectDb } from './db.js';
import authRoutes from './routes/auth.js';
import transactionRoutes from './routes/transactions.js';
import contactRoutes from './routes/contacts.js';
import goalRoutes from './routes/goals.js';
import dashboardRoutes from './routes/dashboard.js';
import backupRoutes from './routes/backup.js';
import bankAccountRoutes from './routes/bankAccounts.js';
import searchRoutes from './routes/search.js';
import { PRIVACY_HTML, TERMS_HTML, ACCOUNT_DELETION_HTML } from './legalPages.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '4.5mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', app: 'BachatCoach API' });
});

function sendLegal(res, html) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.status(200).send(html);
}

app.get(['/privacy', '/api/privacy'], (_req, res) => sendLegal(res, PRIVACY_HTML));
app.get(['/terms', '/api/terms'], (_req, res) => sendLegal(res, TERMS_HTML));
app.get(['/delete-account', '/api/delete-account', '/account-deletion', '/api/account-deletion'], (_req, res) =>
  sendLegal(res, ACCOUNT_DELETION_HTML)
);

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
app.use('/api/bank-accounts', bankAccountRoutes);
app.use('/api/search', searchRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Server error' });
});

export default app;
