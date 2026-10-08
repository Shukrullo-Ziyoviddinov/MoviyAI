import { api } from '@/src/api/client';
import type { AuthProfile } from '@/src/types/auth';

type ApiResponse<T> = {
  ok: boolean;
  data: T;
  error?: string;
};

export type GoogleLoginResult = {
  token: string;
  profile: AuthProfile;
};

export async function loginWithGoogleIdToken(
  idToken: string
): Promise<GoogleLoginResult> {
  const { data } = await api.post<ApiResponse<GoogleLoginResult>>(
    '/api/auth/google',
    { idToken }
  );
  if (!data.ok || !data.data) {
    throw new Error(data.error || 'Google login failed');
  }
  return data.data;
}

export async function fetchAuthMe(): Promise<{
  profile: AuthProfile;
  token?: string;
}> {
  const { data } = await api.get<ApiResponse<AuthProfile> & { token?: string }>(
    '/api/auth/me'
  );
  if (!data.ok || !data.data) {
    throw new Error(data.error || 'Session failed');
  }
  return { profile: data.data, token: data.token };
}

export async function dismissSearchGuide(): Promise<AuthProfile> {
  const { data } = await api.post<ApiResponse<AuthProfile>>(
    '/api/auth/search-guide/dismiss'
  );
  if (!data.ok || !data.data) {
    throw new Error(data.error || 'Dismiss failed');
  }
  return data.data;
}

export async function dismissChatGuide(): Promise<AuthProfile> {
  const { data } = await api.post<ApiResponse<AuthProfile>>(
    '/api/auth/chat-guide/dismiss'
  );
  if (!data.ok || !data.data) {
    throw new Error(data.error || 'Dismiss failed');
  }
  return data.data;
}
