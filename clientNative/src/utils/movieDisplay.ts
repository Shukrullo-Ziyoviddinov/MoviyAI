export function displayMovieTitle(movie:{title?:{uz?:string|null;ru?:string|null};catalogIdentity?:{originalTitle?:string|null}},language:string){
  const locale=language==='ru'?'ru':'uz';
  return movie.title?.[locale]||movie.catalogIdentity?.originalTitle||movie.title?.uz||movie.title?.ru||'—';
}
