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

/** Short in-memory cache so tab switches don't spam Atlas on the free cluster. */
const GET_CACHE_TTL_MS = 30_000;
const getCache = new Map<string, { expires: number; data: unknown }>();

function cacheKey(config: AxiosRequestConfig) {
  const url = config.url || '';
  const params = config.params ? JSON.stringify(config.params) : '';
  return `${(config.method || 'get').toLowerCase()}:${url}?${params}`;
}

function shouldCacheGet(config: AxiosRequestConfig) {
  const method = (config.method || 'get').toLowerCase();
  if (method !== 'get') return false;
  if (config.headers?.['X-Bypass-Cache'] || config.headers?.['x-bypass-cache']) return false;
  const url = config.url || '';
  // Always fresh for large / infrequent backup payloads
  if (url.includes('/backup/export')) return false;
  return true;
}

export function clearApiCache() {
  getCache.clear();
}

export const api = axios.create({
  baseURL: getApiUrl(),
  timeout: 15000,
});

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await SecureStore.getItemAsync('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (shouldCacheGet(config)) {
    const key = cacheKey(config);
    const hit = getCache.get(key);
    if (hit && hit.expires > Date.now()) {
      config.adapter = async () =>
        ({
          data: hit.data,
          status: 200,
          statusText: 'OK (cache)',
          headers: {},
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
    if (method === 'get' && shouldCacheGet(response.config)) {
      getCache.set(cacheKey(response.config), {
        expires: Date.now() + GET_CACHE_TTL_MS,
        data: response.data,
      });
    } else if (['post', 'put', 'patch', 'delete'].includes(method)) {
      getCache.clear();
    }
    return response;
  },
  (error) => Promise.reject(error)
);

export default api;
