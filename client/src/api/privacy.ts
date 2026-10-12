import { apiFetch } from "@/api/client";
import type { PrivacyData } from "@/data/privacy";

type ApiResponse<T> = {
  ok: boolean;
  data: T;
  error?: string;
};

export async function fetchPrivacy(): Promise<PrivacyData> {
  const data = await apiFetch<ApiResponse<PrivacyData>>("/api/privacy", {
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (!data.ok || !data.data) {
    throw new Error(data.error || "Privacy content failed to load");
  }
  return data.data;
}
