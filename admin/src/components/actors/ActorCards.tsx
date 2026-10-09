"use client";

import { ActorAbout } from "@/components/actors/ActorAbout";
import { ActorCardActions } from "@/components/actors/ActorCardActions";
import { MoviePoster } from "@/components/movies/MoviePoster";
import { matchesQuery, usePageSearch } from "@/components/search/page-search";
import { actorImageUrl, type Actor } from "@/lib/movies";

export function ActorCards({ actors }: { actors: Actor[] }) {
  const { query } = usePageSearch();
  const visible = actors.filter((actor) =>
    matchesQuery(query, [
      actor.actorName,
      actor.actorAbout?.uz,
      actor.actorAbout?.ru,
    ]),
  );

  if (visible.length === 0) {
    return <p className="p-6 text-sm text-[#6B7280]">Qidiruv bo‘yicha aktyor topilmadi</p>;
  }

  return (
    <ul className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
      {visible.map((actor) => {
        const name = actor.actorName || "Aktyor";
        return (
          <li key={actor.id} className="min-w-0">
            <article className="flex items-start gap-3 rounded-xl border border-[rgba(40,70,130,0.35)] bg-[#070A12] p-3">
              <div className="h-32 w-24 shrink-0 overflow-hidden rounded-lg bg-[#101624]">
                <MoviePoster src={actorImageUrl(actor.actorImg)} alt={name} />
              </div>
              <div className="flex h-32 min-h-0 min-w-0 flex-1 flex-col gap-2">
                <h2 className="shrink-0 text-base font-semibold text-[#F3F4F6]">{name}</h2>
                <ActorAbout text={actor.actorAbout?.uz} name={name} />
                <ActorCardActions actor={actor} />
              </div>
            </article>
          </li>
        );
      })}
    </ul>
  );
}
