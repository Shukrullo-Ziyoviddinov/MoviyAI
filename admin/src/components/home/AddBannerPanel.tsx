"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { GlobalModal } from "@/components/GlobalModal";
import { ProgressBar } from "@/components/ProgressBar";
import { apiBaseUrl, bannerImageUrl, moviePosterUrl, movieTitle, type Banner, type Movie } from "@/lib/movies";

const fieldClass =
  "w-full rounded-lg border border-[rgba(40,70,130,0.35)] bg-[#101624] px-3 py-2 text-sm text-[#F3F4F6] outline-none";

export function AddBannerPanel({
  banner = null,
  open: openProp,
  onClose,
  onSaved,
  showButton = true,
}: {
  banner?: Banner | null;
  open?: boolean;
  onClose?: () => void;
  onSaved?: () => void;
  showButton?: boolean;
} = {}) {
  const [innerOpen, setInnerOpen] = useState(false);
  const open = openProp ?? innerOpen;
  const [movies, setMovies] = useState<Movie[]>([]);
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [movieId, setMovieId] = useState<number | null>(null);
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const timer = useRef<number | null>(null);
  const uploadingRef = useRef(false);

  useEffect(
    () => () => {
      if (timer.current != null) window.clearInterval(timer.current);
    },
    [],
  );

  useEffect(() => {
    if (!open) return;
    let alive = true;
    fetch(`${apiBaseUrl}/api/movies`, { cache: "no-store" })
      .then((response) => response.json())
      .then((body: { data?: Movie[] }) => {
        if (alive) setMovies(Array.isArray(body.data) ? body.data : []);
      })
      .catch(() => {
        if (alive) setMovies([]);
      });
    return () => {
      alive = false;
    };
  }, [open]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("uz");
    const rows = needle
      ? movies.filter((movie) =>
          `${movie.title?.uz ?? ""} ${movie.title?.ru ?? ""}`.toLocaleLowerCase("uz").includes(needle),
        )
      : movies;
    return rows.slice(0, 30);
  }, [movies, query]);

  function clearTimer() {
    if (timer.current == null) return;
    window.clearInterval(timer.current);
    timer.current = null;
  }

  useEffect(() => {
    if (!open || !banner) return;
    setMovieId(banner.movieId[0] ?? null);
    setImage(null);
    setPreview(bannerImageUrl(banner.img));
    setLoading(false);
    setProgress(0);
    setError("");
  }, [open, banner]);

  useEffect(() => {
    if (!open || !banner) return;
    const linked = movies.find((movie) => movie.id === banner.movieId[0]);
    if (linked) setQuery(movieTitle(linked));
  }, [open, banner, movies]);

  function close() {
    setInnerOpen(false);
    onClose?.();
    setMenuOpen(false);
    setQuery("");
    setMovieId(null);
    setImage(null);
    setPreview("");
    setLoading(false);
    setProgress(0);
    setError("");
  }

  function pickMovie(movie: Movie) {
    setMovieId(movie.id);
    setQuery(movieTitle(movie));
    setMenuOpen(false);
  }

  function onImagePick(file: File | null) {
    clearTimer();
    setImage(file);
    setPreview("");
    if (!file) {
      setLoading(false);
      setProgress(0);
      return;
    }
    setLoading(true);
    setProgress(6);
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(String(reader.result ?? ""));
      setProgress(100);
    };
    reader.onerror = () => {
      setImage(null);
      setPreview("");
      setLoading(false);
      setProgress(0);
    };
    reader.readAsDataURL(file);
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!image && !banner) {
      setError("Rasm kerak");
      return;
    }
    if (movieId == null) {
      setError("Kino biriktirilishi kerak");
      return;
    }
    setSaving(true);
    uploadingRef.current = true;
    setLoading(true);
    setProgress(8);
    clearTimer();
    let value = 8;
    timer.current = window.setInterval(() => {
      value = Math.min(90, value + 4);
      setProgress((current) => Math.max(current, value));
    }, 200);
    try {
      const body = new FormData();
      body.append("data", JSON.stringify({ movieId: [movieId] }));
      if (image) body.append("image", image);
      const result = await new Promise<{ ok?: boolean; error?: string; status: number }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open(
          banner ? "PATCH" : "POST",
          banner ? `${apiBaseUrl}/api/banners/${banner._id}` : `${apiBaseUrl}/api/banners`,
        );
        xhr.upload.onprogress = (eventProgress) => {
          if (!eventProgress.lengthComputable || eventProgress.total <= 0) return;
          const next = Math.round((eventProgress.loaded / eventProgress.total) * 100);
          value = Math.max(value, next);
          setProgress(next);
        };
        xhr.onload = () => {
          try {
            const parsed = JSON.parse(xhr.responseText) as { ok?: boolean; error?: string };
            resolve({ ...parsed, status: xhr.status });
          } catch {
            resolve({ status: xhr.status });
          }
        };
        xhr.onerror = () => reject(new Error("network"));
        xhr.send(body);
      });
      if (result.status < 200 || result.status >= 300 || !result.ok) {
        setError(result.error || "Banner saqlanmadi");
        return;
      }
      setProgress(100);
      onSaved?.();
      close();
    } catch {
      setError("Serverga ulanib bo‘lmadi");
    } finally {
      clearTimer();
      uploadingRef.current = false;
      setLoading(false);
      setSaving(false);
    }
  }

  return (
    <>
      {showButton ? (
        <button
          type="button"
          onClick={() => setInnerOpen(true)}
          className="flex items-center gap-3 rounded-xl border border-[rgba(40,70,130,0.35)] bg-[#070A12] px-4 py-3 text-sm font-medium text-[#F3F4F6]"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1E4FD6] text-lg">+</span>
          Banner qo‘shish
        </button>
      ) : null}
      <GlobalModal open={open} title={banner ? "Tahrirlash" : "Banner qo‘shish"} onClose={close}>
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <div className="flex w-full flex-col gap-2">
            <label
              className={`flex w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border border-[rgba(40,70,130,0.35)] bg-[#101624] ${
                preview ? "min-h-44 p-0" : "gap-2 px-3 py-6"
              }`}
            >
              <input
                className="sr-only"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => onImagePick(event.target.files?.[0] ?? null)}
              />
              {preview ? (
                <img
                  src={preview}
                  alt=""
                  className="h-44 w-full object-contain"
                  onLoad={() => {
                    if (!uploadingRef.current) setLoading(false);
                  }}
                />
              ) : (
                <span className="text-sm text-[#6B7280]">Rasm yuklash</span>
              )}
            </label>
            {loading ? <ProgressBar value={progress} /> : null}
          </div>
          <div className="relative flex flex-col gap-1">
            <span className="text-sm text-[#6B7280]">Kino biriktirish</span>
            <input
              className={fieldClass}
              value={query}
              placeholder="Kino qidirish"
              onFocus={() => setMenuOpen(true)}
              onBlur={() => setMenuOpen(false)}
              onChange={(event) => {
                setQuery(event.target.value);
                setMovieId(null);
                setMenuOpen(true);
              }}
            />
            {menuOpen ? (
              <ul className="scroll-none absolute top-full z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-[rgba(40,70,130,0.35)] bg-[#101624] py-1">
                {filtered.length === 0 ? (
                  <li className="px-3 py-2 text-sm text-[#6B7280]">Kino topilmadi</li>
                ) : (
                  filtered.map((movie) => {
                    const title = movieTitle(movie);
                    return (
                      <li key={movie.id}>
                        <button
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => pickMovie(movie)}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[#F3F4F6] hover:bg-[#070A12]"
                        >
                          <img
                            src={moviePosterUrl(movie.homeImgPoster)}
                            alt=""
                            className="h-12 w-8 shrink-0 rounded object-cover"
                          />
                          <span className="min-w-0">{title}</span>
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            ) : null}
          </div>
          {error ? <p className="text-sm text-[#E11D48]">{error}</p> : null}
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-[#1E4FD6] px-4 py-2.5 text-sm font-medium text-[#F3F4F6] disabled:opacity-60"
          >
            {saving ? "Saqlanmoqda" : "Saqlash"}
          </button>
        </form>
      </GlobalModal>
    </>
  );
}
