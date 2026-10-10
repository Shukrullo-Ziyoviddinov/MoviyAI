import { Suspense } from "react";
import { BannerGrid, BannerGridFallback } from "@/components/banners/BannerGrid";

export default function BannersPage() {
  return (
    <Suspense fallback={<BannerGridFallback />}>
      <BannerGrid />
    </Suspense>
  );
}
