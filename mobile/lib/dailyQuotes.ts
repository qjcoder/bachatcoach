import quotesData from '@/data/dailyQuotes.json';
import { normalizeLanguage } from '@/lib/language';

export type DailyQuote = {
  text: string;
  source: string;
};

type QuoteEntry = {
  en: string;
  ur: string;
  source: string;
};

const QUOTES = quotesData as QuoteEntry[];

/** Day of year 1–366; stable per calendar date. */
export function getDayOfYear(date = new Date()): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function getDailyQuote(lang?: string, date = new Date()): DailyQuote {
  const index = getDayOfYear(date) % QUOTES.length;
  const entry = QUOTES[index];
  const useUrdu = normalizeLanguage(lang) === 'ur';
  return {
    text: useUrdu ? entry.ur : entry.en,
    source: entry.source,
  };
}

export const DAILY_QUOTE_COUNT = QUOTES.length;
