import { Suspense } from "react";
import { ActorGrid, ActorGridFallback } from "@/components/actors/ActorGrid";

export default function ActorsPage() {
  return (
    <Suspense fallback={<ActorGridFallback />}>
      <ActorGrid />
    </Suspense>
  );
}
