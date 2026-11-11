export function displayMovieTitle(movie:{title?:{uz?:string|null;ru?:string|null};catalogIdentity?:{originalTitle?:string|null}},language:string){
  const locale=language==='ru'?'ru':'uz';
  return movie.title?.[locale]||movie.catalogIdentity?.originalTitle||movie.title?.uz||movie.title?.ru||'—';
}

export function displayMovieRating(movie:{ratingImdb?:number|null;ratingKinopoisk?:number|null}){
 const imdb=movie.ratingImdb,kp=movie.ratingKinopoisk;
 return {value:imdb!=null&&Number.isFinite(imdb)?imdb:kp!=null&&Number.isFinite(kp)?kp:null,label:imdb!=null&&Number.isFinite(imdb)?'IMDb':kp!=null&&Number.isFinite(kp)?'Kinopoisk':'IMDb'};
}
