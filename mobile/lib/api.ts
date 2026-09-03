import axios, { type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

function getApiUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5001/api';
  if (Platform.OS === 'android') {
    return envUrl.replace(/localhost|127\.0\.0\.1/g, '10.0.2.2');
  }
  return envUrl;
}

/** Fresh: serve without network. Stale: serve instantly + revalidate in background. */
const FRESH_TTL_MS = 90_000;
const STALE_TTL_MS = 10 * 60_000;

type CacheEntry = {
  freshUntil: number;
  staleUntil: number;
  data: unknown;
};

const getCache = new Map<string, CacheEntry>();
const revalidating = new Set<string>();

/** In-memory JWT — avoids SecureStore round-trip on every request. */
let memoryToken: string | null = null;

export function setAuthToken(token: string | null) {
  memoryToken = token;
}

export function getAuthToken() {
  return memoryToken;
}

function cacheKey(config: AxiosRequestConfig) {
  const url = config.url || '';
  const params = config.params ? JSON.stringify(config.params) : '';
  return `${(config.method || 'get').toLowerCase()}:${url}?${params}`;
}

function headerFlag(config: AxiosRequestConfig, name: string) {
  const headers = config.headers as Record<string, unknown> | undefined;
  if (!headers) return false;
  const lower = name.toLowerCase();
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === lower && headers[key]) return true;
  }
  return false;
}

function isBackupExport(url?: string) {
  return Boolean(url?.includes('/backup/export'));
}

function shouldServeFromCache(config: AxiosRequestConfig) {
  const method = (config.method || 'get').toLowerCase();
  if (method !== 'get') return false;
  if (headerFlag(config, 'X-Bypass-Cache')) return false;
  if (headerFlag(config, 'X-SWR-Revalidate')) return false;
  if (isBackupExport(config.url)) return false;
  return true;
}

function putCache(config: AxiosRequestConfig, data: unknown) {
  if ((config.method || 'get').toLowerCase() !== 'get') return;
  if (isBackupExport(config.url)) return;
  const now = Date.now();
  getCache.set(cacheKey(config), {
    data,
    freshUntil: now + FRESH_TTL_MS,
    staleUntil: now + STALE_TTL_MS,
  });
}

function pathFromUrl(url?: string) {
  if (!url) return '';
  try {
    if (url.startsWith('http')) return new URL(url).pathname;
  } catch {
    /* ignore */
  }
  return url.split('?')[0] || '';
}

/** Invalidate only related GET keys after a mutation (keeps unrelated tabs warm). */
function invalidateForMutation(url?: string) {
  const path = pathFromUrl(url);
  const prefixes: string[] = [];

  if (path.includes('/transactions') || path.includes('/dashboard')) {
    prefixes.push('/transactions', '/dashboard');
  }
  if (path.includes('/contacts')) {
    prefixes.push('/contacts', '/dashboard');
  }
  if (path.includes('/goals')) {
    prefixes.push('/goals', '/dashboard');
  }
  if (path.includes('/auth') || path.includes('/backup') || !prefixes.length) {
    getCache.clear();
    return;
  }

  for (const key of [...getCache.keys()]) {
    if (prefixes.some((p) => key.includes(p))) getCache.delete(key);
  }
}

export function clearApiCache() {
  getCache.clear();
}

export function peekApiCache<T = unknown>(url: string, params?: Record<string, unknown>): T | null {
  const key = cacheKey({ method: 'get', url, params });
  const hit = getCache.get(key);
  if (!hit || hit.staleUntil <= Date.now()) return null;
  return hit.data as T;
}

export const api = axios.create({
  baseURL: getApiUrl(),
  timeout: 12000,
});

function scheduleRevalidate(config: InternalAxiosRequestConfig) {
  const key = cacheKey(config);
  if (revalidating.has(key)) return;
  revalidating.add(key);

  void api
    .request({
      url: config.url,
      method: config.method,
      params: config.params,
      headers: { 'X-SWR-Revalidate': '1' },
    })
    .catch(() => undefined)
    .finally(() => {
      revalidating.delete(key);
    });
}

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  let token = memoryToken;
  if (!token) {
    token = await SecureStore.getItemAsync('token');
    if (token) memoryToken = token;
  }
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (shouldServeFromCache(config)) {
    const hit = getCache.get(cacheKey(config));
    const now = Date.now();

    if (hit && hit.freshUntil > now) {
      config.adapter = async () =>
        ({
          data: hit.data,
          status: 200,
          statusText: 'OK (cache)',
          headers: { 'x-cache': 'HIT' },
          config,
          request: {},
        }) as never;
    } else if (hit && hit.staleUntil > now) {
      scheduleRevalidate(config);
      config.adapter = async () =>
        ({
          data: hit.data,
          status: 200,
          statusText: 'OK (stale)',
          headers: { 'x-cache': 'STALE' },
          config,
          request: {},
        }) as never;
    }
  }

  return config;
});

api.interceptors.response.use(
  (response) => {
    const method = (response.config.method || 'get').toLowerCase();
    if (method === 'get') {
      // Warm cache for normal GETs, SWR revalidate, and pull-to-refresh bypass
      putCache(response.config, response.data);
    } else if (['post', 'put', 'patch', 'delete'].includes(method)) {
      invalidateForMutation(response.config.url);
    }
    return response;
  },
  (error) => Promise.reject(error)
);

/** Warm critical GETs after login / when tabs mount so navigation feels instant. */
export async function prefetchCriticalData(lang = 'en') {
  const year = new Date().getFullYear();
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

  await Promise.allSettled([
    api.get('/dashboard/summary', { params: { lang } }),
    api.get('/transactions', { params: { from, to, limit: 200 } }),
    api.get('/contacts', { params: { includeSettled: 1 } }),
    api.get('/dashboard/monthly-report', { params: { year } }),
  ]);
}

export default api;
