import { ActorCards } from "@/components/actors/ActorCards";
import { fetchActors } from "@/lib/movies";

export async function ActorGrid() {
  let actors: Awaited<ReturnType<typeof fetchActors>> = [];
  try {
    actors = await fetchActors();
  } catch {
    return <p className="p-6 text-sm text-[#6B7280]">Aktyorlar yuklanmadi</p>;
  }

  if (actors.length === 0) {
    return <p className="p-6 text-sm text-[#6B7280]">Aktyorlar topilmadi</p>;
  }

  return <ActorCards actors={actors} />;
}

export function ActorGridFallback() {
  return (
    <ul className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 3 }, (_, index) => (
        <li key={index} className="flex items-start gap-3 rounded-xl border border-[rgba(40,70,130,0.35)] bg-[#070A12] p-3">
          <div className="h-32 w-24 shrink-0 rounded-lg bg-[#101624]" />
          <div className="flex h-32 flex-1 flex-col gap-2">
            <div className="h-5 w-2/3 rounded bg-[#101624]" />
            <div className="h-4 w-full rounded bg-[#101624]" />
            <div className="h-4 w-full rounded bg-[#101624]" />
            <div className="h-4 w-5/6 rounded bg-[#101624]" />
          </div>
        </li>
      ))}
    </ul>
  );
}
