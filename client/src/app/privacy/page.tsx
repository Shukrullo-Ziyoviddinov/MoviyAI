import { Suspense } from "react";
import { fetchPrivacy } from "@/api/privacy";
import { PrivacyScreen } from "@/components/privacy/PrivacyScreen";
import type { PrivacyData } from "@/data/privacy";

export default function PrivacyPage() {
  return (
    <Suspense fallback={<PrivacyScreen data={null} error={null} />}>
      <PrivacyContent />
    </Suspense>
  );
}

async function PrivacyContent() {
  let data: PrivacyData | null = null;
  let error: string | null = null;
  try {
    data = await fetchPrivacy();
  } catch (err) {
    error = err instanceof Error ? err.message : "Load failed";
  }

  return <PrivacyScreen data={data} error={error} />;
}
