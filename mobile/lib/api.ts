import axios from 'axios';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

function getApiUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5001/api';
  if (Platform.OS === 'android') {
    return envUrl.replace(/localhost|127\.0\.0\.1/g, '10.0.2.2');
  }
  return envUrl;
}

export const api = axios.create({
  baseURL: getApiUrl(),
  timeout: 15000,
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
