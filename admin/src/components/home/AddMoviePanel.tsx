"use client";

import { useEffect, useRef, useState } from "react";
import { GlobalModal } from "@/components/GlobalModal";
import { ProgressBar } from "@/components/ProgressBar";
import { actorImageUrl, apiBaseUrl, moviePosterUrl, movieTitle, type Movie } from "@/lib/movies";

const CATEGORIES = [
  "actionMovies",
  "romanceMovies",
  "animationMovies",
  "horrorMovies",
  "sciFiMovies",
  "familyMovies",
  "dramaMovies",
  "comedyMovies",
];

type Actor = {
  id: number;
  actorName?: string;
  actorImg?: string;
};

type Desc = {
  text: string;
  year: string;
  country: string;
  duration: string;
  director: string;
};

const emptyDesc = (): Desc => ({
  text: "",
  year: "",
  country: "",
  duration: "",
  director: "",
});

const fieldClass =
  "w-full rounded-lg border border-[rgba(40,70,130,0.35)] bg-[#101624] px-3 py-2 text-sm text-[#F3F4F6] outline-none";

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm text-[#6B7280]">{label}</span>
      <input className={fieldClass} type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function splitList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function AddMoviePanel() {
  const [open, setOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [movieOpen, setMovieOpen] = useState(false);
  const [actorOpen, setActorOpen] = useState(false);
  const [movieQuery, setMovieQuery] = useState("");
  const [actorQuery, setActorQuery] = useState("");
  const [categories, setCategories] = useState(CATEGORIES);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [actors, setActors] = useState<Actor[]>([]);
  const [categoryName, setCategoryName] = useState("");
  const [titleUz, setTitleUz] = useState("");
  const [titleRu, setTitleRu] = useState("");
  const [poster, setPoster] = useState<File | null>(null);
  const [posterPreview, setPosterPreview] = useState("");
  const [posterProgress, setPosterProgress] = useState(0);
  const [posterLoading, setPosterLoading] = useState(false);
  const posterTimer = useRef<number | null>(null);
  const [ratingImdb, setRatingImdb] = useState("");
  const [ratingKinopoisk, setRatingKinopoisk] = useState("");
  const [genreUz, setGenreUz] = useState("");
  const [genreRu, setGenreRu] = useState("");
  const [uz, setUz] = useState<Desc>(emptyDesc);
  const [ru, setRu] = useState<Desc>(emptyDesc);
  const [trailers, setTrailers] = useState("");
  const [watchUrl, setWatchUrl] = useState("");
  const [typeCategory, setTypeCategory] = useState("");
  const [filterCountry, setFilterCountry] = useState("");
  const [filterGenres, setFilterGenres] = useState<string[]>([]);
  const [genreOptions, setGenreOptions] = useState<string[]>([]);
  const [genreOpen, setGenreOpen] = useState(false);
  const [like, setLike] = useState("0");
  const [dislike, setDislike] = useState("0");
  const [specsDuration, setSpecsDuration] = useState("");
  const [ageRating, setAgeRating] = useState("");
  const [specsYear, setSpecsYear] = useState("");
  const [specsCountries, setSpecsCountries] = useState("");
  const [franchiseIds, setFranchiseIds] = useState<number[]>([]);
  const [actorIds, setActorIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    void (async () => {
      try {
        const [movieRes, actorRes, genreRes] = await Promise.all([
          fetch(`${apiBaseUrl}/api/movies`),
          fetch(`${apiBaseUrl}/api/actors`),
          fetch(`${apiBaseUrl}/api/genres`),
        ]);
        const movieBody = (await movieRes.json()) as { data?: Movie[] };
        const actorBody = (await actorRes.json()) as { data?: Actor[] };
        const genreBody = (await genreRes.json()) as { data?: { name?: string }[] };
        const list = Array.isArray(movieBody.data) ? movieBody.data : [];
        setMovies(list);
        setActors(Array.isArray(actorBody.data) ? actorBody.data : []);
        setGenreOptions(
          (Array.isArray(genreBody.data) ? genreBody.data : [])
            .map((genre) => genre.name ?? "")
            .filter(Boolean),
        );
        const names = list.map((movie) => movie.categoryName).filter((name): name is string => Boolean(name));
        setCategories(Array.from(new Set([...CATEGORIES, ...names])));
      } catch {
        setCategories(CATEGORIES);
      }
    })();
  }, [open]);

  useEffect(() => clearPosterTimer, []);

  const movieTerm = movieQuery.trim().toLowerCase();
  const visibleMovies = movieTerm
    ? movies.filter((movie) => movieTitle(movie).toLowerCase().includes(movieTerm))
    : movies;
  const actorTerm = actorQuery.trim().toLowerCase();
  const visibleActors = actorTerm
    ? actors.filter((actor) => (actor.actorName ?? "").toLowerCase().includes(actorTerm))
    : actors;

  function clearPosterTimer() {
    if (posterTimer.current == null) return;
    window.clearInterval(posterTimer.current);
    posterTimer.current = null;
  }

  function onPosterPick(file: File | null) {
    clearPosterTimer();
    setPoster(file);
    setPosterPreview("");
    if (!file) {
      setPosterLoading(false);
      setPosterProgress(0);
      return;
    }
    setPosterLoading(true);
    setPosterProgress(6);
    let value = 6;
    posterTimer.current = window.setInterval(() => {
      value = Math.min(90, value + 7);
      setPosterProgress(value);
    }, 80);
    const reader = new FileReader();
    reader.onprogress = (event) => {
      if (!event.lengthComputable || event.total <= 0) return;
      value = Math.max(value, Math.round((event.loaded / event.total) * 90));
      setPosterProgress(value);
    };
    reader.onload = () => {
      clearPosterTimer();
      setPosterPreview(String(reader.result ?? ""));
      setPosterProgress(100);
    };
    reader.onerror = () => {
      clearPosterTimer();
      setPoster(null);
      setPosterPreview("");
      setPosterLoading(false);
      setPosterProgress(0);
    };
    reader.readAsDataURL(file);
  }

  function toggleId(list: number[], id: number, setList: (value: number[]) => void) {
    setList(list.includes(id) ? list.filter((item) => item !== id) : [...list, id]);
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!poster) {
      setError("Poster kerak");
      return;
    }
    setSaving(true);
    try {
      const body = new FormData();
      body.append(
        "data",
        JSON.stringify({
          categoryName,
          title: { uz: titleUz, ru: titleRu },
          ratingImdb,
          ratingKinopoisk,
          genre: { uz: splitList(genreUz), ru: splitList(genreRu) },
          description: { uz, ru },
          trailers,
          watchUrl,
          typeCategory: splitList(typeCategory),
          filterCountry,
          filterGenre: filterGenres,
          like,
          dislike,
          specs: {
            duration: specsDuration,
            ageRating,
            year: specsYear,
            countries: splitList(specsCountries),
          },
          franchiseMovieIds: franchiseIds,
          actorIds,
        }),
      );
      body.append("poster", poster);
      const response = await fetch(`${apiBaseUrl}/api/movies`, { method: "POST", body });
      const result = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !result.ok) {
        setError(result.error || "Kino saqlanmadi");
        return;
      }
      setOpen(false);
    } catch {
      setError("Serverga ulanib bo‘lmadi");
    } finally {
      setSaving(false);
    }
  }

  function descFields(value: Desc, setValue: (next: Desc) => void, prefix: string) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium text-[#F3F4F6]">{prefix}</p>
        <Field label="Matn" value={value.text} onChange={(text) => setValue({ ...value, text })} />
        <Field label="Yil" value={value.year} onChange={(year) => setValue({ ...value, year })} />
        <Field label="Davlat" value={value.country} onChange={(country) => setValue({ ...value, country })} />
        <Field label="Davomiylik" value={value.duration} onChange={(duration) => setValue({ ...value, duration })} />
        <Field label="Rejissyor" value={value.director} onChange={(director) => setValue({ ...value, director })} />
      </div>
    );
  }

  return (
    <section className="p-6">
      <h2 className="text-lg font-semibold text-[#F3F4F6]">Amallar</h2>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 flex items-center gap-3 rounded-xl border border-[rgba(40,70,130,0.35)] bg-[#070A12] px-4 py-3 text-sm font-medium text-[#F3F4F6]"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1E4FD6] text-lg">+</span>
        Kino qo‘shish
      </button>
      <GlobalModal wide open={open} title="Kino qo‘shish" onClose={() => setOpen(false)}>
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <div className="relative">
            <span className="mb-1 block text-sm text-[#6B7280]">Bo‘lim tanlang</span>
            <input
              readOnly
              className={fieldClass}
              placeholder="Bo‘lim tanlang"
              value={categoryName}
              onClick={() => setCategoryOpen((value) => !value)}
            />
            {categoryOpen ? (
              <ul className="mt-1 max-h-48 scroll-none overflow-y-auto rounded-lg border border-[rgba(40,70,130,0.35)] bg-[#101624]">
                {categories.map((name) => (
                  <li key={name}>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm text-[#F3F4F6]"
                      onClick={() => {
                        setCategoryName(name);
                        setCategoryOpen(false);
                      }}
                    >
                      {name}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Kino nomi (o‘zbekcha)" value={titleUz} onChange={setTitleUz} />
            <Field label="Kino nomi (ruscha)" value={titleRu} onChange={setTitleRu} />
          </div>

          <div className="flex w-full flex-col gap-2">
            <label
              className={`flex w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border border-[rgba(40,70,130,0.35)] bg-[#101624] ${
                posterPreview ? "min-h-44 p-0" : "gap-2 px-3 py-6"
              }`}
            >
              <input
                className="sr-only"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => onPosterPick(event.target.files?.[0] ?? null)}
              />
              {posterPreview ? (
                <img
                  src={posterPreview}
                  alt=""
                  className="h-44 w-full object-cover"
                  onLoad={() => setPosterLoading(false)}
                />
              ) : (
                <>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-[#6B7280]">
                    <path
                      d="M12 16V5M12 5l-4 4M12 5l4 4"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M4 16.5V18a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1.5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="text-sm text-[#6B7280]">Poster yuklash</span>
                </>
              )}
            </label>
            {posterLoading ? <ProgressBar value={posterProgress} /> : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="IMDb reyting" value={ratingImdb} onChange={setRatingImdb} />
            <Field label="Kinopoisk reyting" value={ratingKinopoisk} onChange={setRatingKinopoisk} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Janr, o‘zbekcha" value={genreUz} onChange={setGenreUz} />
            <Field label="Janr, ruscha" value={genreRu} onChange={setGenreRu} />
          </div>

          <div className="rounded-xl border border-[rgba(40,70,130,0.35)] p-3">
            <h3 className="mb-3 text-sm font-semibold text-[#F3F4F6]">Kino ma’lumotlari</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {descFields(uz, setUz, "O‘zbekcha")}
              {descFields(ru, setRu, "Ruscha")}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Treyler link" value={trailers} onChange={setTrailers} />
            <Field label="Tomosha link" value={watchUrl} onChange={setWatchUrl} />
          </div>

          <Field label="Tur" value={typeCategory} onChange={setTypeCategory} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Filtr davlat" value={filterCountry} onChange={setFilterCountry} />
            <div>
              <span className="mb-1 block text-sm text-[#6B7280]">Filtr janr</span>
              <input
                readOnly
                className={fieldClass}
                placeholder="Filtr janr"
                value={filterGenres.join(", ")}
                onClick={() => setGenreOpen((value) => !value)}
              />
              {genreOpen ? (
                <ul className="mt-1 max-h-48 scroll-none overflow-y-auto rounded-lg border border-[rgba(40,70,130,0.35)] bg-[#101624]">
                  {genreOptions.map((name) => (
                    <li key={name}>
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm text-[#F3F4F6]"
                        onClick={() =>
                          setFilterGenres((current) =>
                            current.includes(name)
                              ? current.filter((item) => item !== name)
                              : [...current, name],
                          )
                        }
                      >
                        {filterGenres.includes(name) ? "✓ " : ""}
                        {name}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Like" value={like} onChange={setLike} />
            <Field label="Dislike" value={dislike} onChange={setDislike} />
          </div>

          <div className="rounded-xl border border-[rgba(40,70,130,0.35)] p-3">
            <h3 className="mb-3 text-sm font-semibold text-[#F3F4F6]">Specs</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Davomiylik" value={specsDuration} onChange={setSpecsDuration} />
              <Field label="Yosh chegarasi" value={ageRating} onChange={setAgeRating} />
              <Field label="Yil" value={specsYear} onChange={setSpecsYear} />
              <Field label="Davlatlar" value={specsCountries} onChange={setSpecsCountries} />
            </div>
          </div>

          <div>
            <span className="mb-1 block text-sm text-[#6B7280]">Kino qismi qo‘shish</span>
            <input
              readOnly
              className={fieldClass}
              placeholder="Kino qismi qo‘shish"
              value={franchiseIds
                .map((id) => movieTitle(movies.find((movie) => movie.id === id) ?? { id }))
                .join(", ")}
              onClick={() => {
                setMovieOpen((value) => !value);
                setMovieQuery("");
              }}
            />
            {movieOpen ? (
              <div className="mt-1 overflow-hidden rounded-lg border border-[rgba(40,70,130,0.35)] bg-[#101624]">
                <input
                  className="w-full border-b border-[#1E4FD6] bg-[#152038] px-3 py-2 text-sm text-[#F3F4F6] outline-none placeholder:text-[#6B7280]"
                  placeholder="Kino nomi"
                  value={movieQuery}
                  onChange={(event) => setMovieQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") event.preventDefault();
                  }}
                />
                <ul className="max-h-48 scroll-none overflow-y-auto">
                {visibleMovies.map((movie) => (
                  <li key={movie.id}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-[#F3F4F6]"
                      onClick={() => toggleId(franchiseIds, movie.id, setFranchiseIds)}
                    >
                      <img
                        src={moviePosterUrl(movie.homeImgPoster)}
                        alt=""
                        className="h-12 w-8 rounded object-cover"
                      />
                      <span>
                        {franchiseIds.includes(movie.id) ? "✓ " : ""}
                        {movieTitle(movie)}
                      </span>
                    </button>
                  </li>
                ))}
                </ul>
              </div>
            ) : null}
          </div>

          <div>
            <span className="mb-1 block text-sm text-[#6B7280]">Aktyorlar</span>
            <input
              readOnly
              className={fieldClass}
              placeholder="Aktyor tanlang"
              value={actorIds
                .map((id) => actors.find((actor) => actor.id === id)?.actorName ?? String(id))
                .join(", ")}
              onClick={() => {
                setActorOpen((value) => !value);
                setActorQuery("");
              }}
            />
            {actorOpen ? (
              <div className="mt-1 overflow-hidden rounded-lg border border-[rgba(40,70,130,0.35)] bg-[#101624]">
                <input
                  className="w-full border-b border-[#1E4FD6] bg-[#152038] px-3 py-2 text-sm text-[#F3F4F6] outline-none placeholder:text-[#6B7280]"
                  placeholder="Aktyor nomi"
                  value={actorQuery}
                  onChange={(event) => setActorQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") event.preventDefault();
                  }}
                />
                <ul className="max-h-56 scroll-none overflow-y-auto">
                {visibleActors.map((actor) => (
                  <li key={actor.id}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-[#F3F4F6]"
                      onClick={() => toggleId(actorIds, actor.id, setActorIds)}
                    >
                      <img
                        src={actorImageUrl(actor.actorImg)}
                        alt=""
                        className="h-10 w-8 rounded object-cover"
                      />
                      <span>
                        {actorIds.includes(actor.id) ? "✓ " : ""}
                        {actor.actorName}
                      </span>
                    </button>
                  </li>
                ))}
                </ul>
              </div>
            ) : null}
          </div>

          {error ? <p className="text-sm text-[#F3F4F6]">{error}</p> : null}
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-[#1E4FD6] px-4 py-2.5 text-sm font-medium text-[#F3F4F6]"
          >
            {saving ? "Saqlanmoqda" : "Saqlash"}
          </button>
        </form>
      </GlobalModal>
    </section>
  );
}
