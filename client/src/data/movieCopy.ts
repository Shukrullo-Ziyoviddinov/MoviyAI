import type { AppLanguage } from "@/components/language/language-state";
import { durationUnit, translate } from "@/i18n";

export type MovieCopy = {
  watch: string;
  save: string;
  trailer: string;
  trailerUnavailable: string;
  aboutTitle: string;
  actorsTitle: string;
  readMore: string;
  moreInfo: string;
  similarTrailers: string;
  similarMovies: string;
  year: string;
  country: string;
  duration: string;
  director: string;
  commentsTitle: string;
  commentPlaceholder: string;
  moreComments: string;
  noComments: string;
  reply: string;
  moreReplies: string;
  lessReplies: string;
  minutes: string;
  notFound: string;
};

export function movieCopy(language: AppLanguage): MovieCopy {
  const t = (key: string) => translate(language, key);
  return {
    watch: t("movie.watch"),
    save: t("movie.save"),
    trailer: t("movie.trailer"),
    trailerUnavailable: t("movie.trailerUnavailable"),
    aboutTitle: t("movie.aboutTitle"),
    actorsTitle: t("movie.actorsTitle"),
    readMore: t("movie.readMore"),
    moreInfo: t("movie.moreInfo"),
    similarTrailers: t("movie.similarTrailers"),
    similarMovies: t("movie.similarMovies"),
    year: t("movie.year"),
    country: t("movie.country"),
    duration: t("movie.duration"),
    director: t("movie.director"),
    commentsTitle: t("movie.commentsTitle"),
    commentPlaceholder: t("movie.commentPlaceholder"),
    moreComments: t("movie.moreComments"),
    noComments: t("movie.noComments"),
    reply: t("movie.reply"),
    moreReplies: t("movie.moreReplies"),
    lessReplies: t("movie.lessReplies"),
    minutes: durationUnit(language),
    notFound: language === "ru" ? "Фильм не найден" : language === "en" ? "Movie not found" : "Kino topilmadi",
  };
}
