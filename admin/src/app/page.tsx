import { AddActorPanel } from "@/components/home/AddActorPanel";
import { AddMoviePanel } from "@/components/home/AddMoviePanel";

export default function HomePage() {
  return (
    <section className="p-6">
      <div className="rounded-[20px] border border-[rgba(40,70,130,0.35)] bg-[#070A12] p-5">
        <h2 className="text-lg font-semibold text-[#F3F4F6]">Amallar</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <AddMoviePanel />
          <AddActorPanel />
        </div>
      </div>
    </section>
  );
}
