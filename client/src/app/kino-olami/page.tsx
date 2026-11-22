import type { Metadata } from "next";
import { BottomNav } from "@/components/nav/BottomNav";

export const metadata: Metadata = { title: "Kino olami | MoviyAI" };

const embedUrl = process.env.NEXT_PUBLIC_KINO_OLAMI_EMBED_URL?.trim() ||
  (process.env.NODE_ENV === "development"
    ? "http://localhost:5000/embed"
    : "https://kino-olami.uz/embed");

export default function KinoOlamiPage() {
  return (
    <main className="flex h-full flex-col pt-[max(0px,calc(var(--tg-back,env(safe-area-inset-top,0px))_-_8px))] md:pt-0">
      <iframe
        src={embedUrl}
        title="Kino olami"
        className="min-h-0 w-full flex-1 border-0"
        allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
        allowFullScreen
      />
      <BottomNav />
    </main>
  );
}
