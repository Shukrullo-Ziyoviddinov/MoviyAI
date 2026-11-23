import type { Metadata } from "next";
import { KinoOlamiFrame } from "./KinoOlamiFrame";

export const metadata: Metadata = { title: "Kino olami | MoviyAI" };

const embedUrl = process.env.NEXT_PUBLIC_KINO_OLAMI_EMBED_URL?.trim() ||
  (process.env.NODE_ENV === "development"
    ? "http://localhost:5000/embed"
    : "https://kino-olami.uz/embed");

export default function KinoOlamiPage() {
  return (
    <main className="flex h-full flex-col pt-[max(0px,calc(var(--tg-back,0px)_-_8px))] md:pt-0">
      <KinoOlamiFrame embedUrl={embedUrl} />
    </main>
  );
}
