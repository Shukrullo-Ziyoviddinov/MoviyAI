import axios from 'axios';
import Constants from 'expo-constants';
import { getAuthTokenSync } from '@/src/stores/useAuthStore';
import { getSecureItem } from '@/src/utils/storage';

const TOKEN_KEY = 'moviy.authToken';

const baseURL =
  (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ??
  'https://api.example.com';

export const api = axios.create({
  baseURL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  let token = getAuthTokenSync();
  if (!token) {
    token = await getSecureItem(TOKEN_KEY);
  }
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
);
