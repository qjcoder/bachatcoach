import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const quotesPath = path.join(__dirname, '../../../mobile/data/dailyQuotes.json');
const QUOTES = JSON.parse(readFileSync(quotesPath, 'utf8'));

export function getDayOfYear(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function getDailyQuote(lang = 'en', date = new Date()) {
  const index = getDayOfYear(date) % QUOTES.length;
  const entry = QUOTES[index];
  const useUrdu = lang === 'ur';
  return {
    text: useUrdu ? entry.ur : entry.en,
    source: entry.source,
  };
}

export const DAILY_QUOTE_COUNT = QUOTES.length;
