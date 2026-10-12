import { Suspense } from "react";
import { fetchAbout } from "@/api/about";
import { AboutScreen } from "@/components/about/AboutScreen";
import type { AboutData } from "@/data/about";

export default function AboutPage() {
  return (
    <Suspense fallback={<AboutScreen data={null} error={null} />}>
      <AboutContent />
    </Suspense>
  );
}

async function AboutContent() {
  let data: AboutData | null = null;
  let error: string | null = null;
  try {
    data = await fetchAbout();
  } catch (err) {
    error = err instanceof Error ? err.message : "Load failed";
  }

  return <AboutScreen data={data} error={error} />;
}
