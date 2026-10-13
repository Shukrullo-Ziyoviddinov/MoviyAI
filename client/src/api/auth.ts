import { apiFetch, readAuthToken } from "@/api/client";
import type { AuthProfile } from "@/types/auth";

type ApiResponse<T> = {
  ok: boolean;
  data: T;
  error?: string;
};

export type GoogleLoginResult = {
  token: string;
  profile: AuthProfile;
};

export async function loginWithGoogleIdToken(idToken: string): Promise<GoogleLoginResult> {
  const response = await fetch("/api/auth/google", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
    cache: "no-store",
  });
  const data = (await response.json()) as ApiResponse<GoogleLoginResult>;
  if (!response.ok || !data.ok || !data.data?.token) {
    throw new Error(data.error || "Google login failed");
  }
  return data.data;
}

export async function fetchAuthMe(): Promise<{ profile: AuthProfile; token?: string }> {
  const headers = new Headers({ Accept: "application/json" });
  const token = readAuthToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch("/api/auth/me", { headers, cache: "no-store" });
  const data = (await response.json()) as ApiResponse<AuthProfile> & { token?: string };
  if (!response.ok || !data.ok || !data.data) {
    throw new Error(data.error || "Session failed");
  }
  return { profile: data.data, token: data.token };
}

export async function dismissSearchGuide(): Promise<AuthProfile> {
  const data = await apiFetch<ApiResponse<AuthProfile>>("/api/auth/search-guide/dismiss", {
    method: "POST",
  });
  if (!data.ok || !data.data) {
    throw new Error(data.error || "Dismiss failed");
  }
  return data.data;
}

export async function dismissChatGuide(): Promise<AuthProfile> {
  const data = await apiFetch<ApiResponse<AuthProfile>>("/api/auth/chat-guide/dismiss", {
    method: "POST",
  });
  if (!data.ok || !data.data) {
    throw new Error(data.error || "Dismiss failed");
  }
  return data.data;
}
