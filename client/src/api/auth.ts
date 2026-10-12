import { apiFetch } from "@/api/client";
import type { AuthProfile } from "@/types/auth";

type ApiResponse<T> = {
  ok: boolean;
  data: T;
  error?: string;
};

export async function dismissChatGuide(): Promise<AuthProfile> {
  const data = await apiFetch<ApiResponse<AuthProfile>>("/api/auth/chat-guide/dismiss", {
    method: "POST",
  });
  if (!data.ok || !data.data) {
    throw new Error(data.error || "Dismiss failed");
  }
  return data.data;
}
