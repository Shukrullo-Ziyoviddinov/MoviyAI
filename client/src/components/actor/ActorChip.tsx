"use client";

import Link from "next/link";
import { actorImageUrl, type MovieActor } from "@/api/movies";
import { useImageReady } from "@/components/common/useImageReady";
import { useTheme } from "@/components/theme/theme-state";

export function ActorChip({ actor }: { actor: MovieActor }) {
  const { colors, isDark } = useTheme();
  const photo = actorImageUrl(actor.actorImg);
  const image = useImageReady(photo);
  const bone = isDark ? "rgba(255,255,255,0.14)" : "rgba(17,24,39,0.10)";

  return (
    <Link href={`/actor/${actor.id}`} className="mr-3.5 w-[88px] shrink-0 text-center">
      <div
        className="relative mx-auto h-[72px] w-[72px] overflow-hidden rounded-full border"
        style={{ backgroundColor: colors.panelSoft, borderColor: colors.borderSoft }}
      >
        {photo && !image.ready ? <div className="absolute inset-0 z-0 animate-pulse rounded-full" style={{ backgroundColor: bone }} /> : null}
        {photo ? (
          <img
            ref={image.ref}
            src={photo}
            alt=""
            className="relative z-[1] h-full w-full object-cover"
            onLoad={image.onLoad}
            onError={image.onError}
          />
        ) : null}
      </div>
      <p className="mt-2 truncate text-[13px] leading-4 font-semibold" style={{ color: colors.text }}>
        {actor.actorName}
      </p>
    </Link>
  );
}
