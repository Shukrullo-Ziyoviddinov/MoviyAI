import axios from 'axios';
import Constants from 'expo-constants';
import {
  getAuthTokenKey,
  getAuthTokenSync,
  setAuthTokenSync,
} from '@/src/utils/authToken';
import { getSecureItem } from '@/src/utils/storage';

export const apiBaseUrl =
  (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ??
  'https://api.example.com';

export const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  let token = getAuthTokenSync();
  if (!token) {
    token = await getSecureItem(getAuthTokenKey());
    if (token) setAuthTokenSync(token);
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
