import { AddActorPanel } from "@/components/home/AddActorPanel";
import { AddMoviePanel } from "@/components/home/AddMoviePanel";

export default function HomePage() {
  return (
    <section className="p-6">
      <h2 className="text-lg font-semibold text-[#F3F4F6]">Amallar</h2>
      <div className="mt-4 flex flex-wrap gap-3">
        <AddMoviePanel />
        <AddActorPanel />
      </div>
    </section>
  );
}
