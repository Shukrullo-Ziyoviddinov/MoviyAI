"use client";

import { useState } from "react";

export function MoviePoster({
  src,
  alt,
  fit = "cover",
}: {
  src: string;
  alt: string;
  fit?: "cover" | "contain";
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return <div className="h-full w-full bg-[#101624]" />;
  }

  return (
    <img
      src={src}
      alt={alt}
      className={`h-full w-full ${fit === "contain" ? "object-contain" : "object-cover"}`}
      onError={() => setFailed(true)}
    />
  );
}
