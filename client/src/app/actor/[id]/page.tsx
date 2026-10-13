import { Suspense } from "react";
import { fetchActorById, type Actor } from "@/api/actors";
import { ActorScreen } from "@/components/actor/ActorScreen";

export default function ActorPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<ActorScreen loading />}>
      <ActorContent params={params} />
    </Suspense>
  );
}

async function ActorContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actorId = Number(id);
  if (!Number.isFinite(actorId)) {
    return <ActorScreen error="Invalid actor id" />;
  }

  let actor: Actor | null = null;
  let error: string | null = null;
  try {
    actor = await fetchActorById(actorId);
  } catch (err) {
    error = err instanceof Error ? err.message : "Load failed";
  }

  return <ActorScreen actor={actor} error={error} />;
}
