import { ActorAbout } from "@/components/actors/ActorAbout";
import { MoviePoster } from "@/components/movies/MoviePoster";
import { actorImageUrl, fetchActors } from "@/lib/movies";

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

  return (
    <ul className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
      {actors.map((actor) => {
        const name = actor.actorName || "Aktyor";
        return (
          <li key={actor.id} className="min-w-0">
            <article className="flex h-64 gap-3 rounded-xl border border-[rgba(40,70,130,0.35)] bg-[#070A12] p-3">
              <div className="h-full w-36 shrink-0 overflow-hidden rounded-lg bg-[#101624]">
                <MoviePoster src={actorImageUrl(actor.actorImg)} alt={name} />
              </div>
              <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
                <h2 className="shrink-0 text-base font-semibold text-[#F3F4F6]">{name}</h2>
                <ActorAbout text={actor.actorAbout?.uz} name={name} />
              </div>
            </article>
          </li>
        );
      })}
    </ul>
  );
}

export function ActorGridFallback() {
  return (
    <ul className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 3 }, (_, index) => (
        <li key={index} className="flex h-64 gap-3 rounded-xl border border-[rgba(40,70,130,0.35)] bg-[#070A12] p-3">
          <div className="h-full w-36 shrink-0 rounded-lg bg-[#101624]" />
          <div className="flex flex-1 flex-col gap-2">
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
