import axios from 'axios';
import Constants from 'expo-constants';
import { getOrCreateUserId } from '@/src/utils/userId';

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
  const userId = await getOrCreateUserId();
  config.headers.set('X-User-Id', userId);
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
);
