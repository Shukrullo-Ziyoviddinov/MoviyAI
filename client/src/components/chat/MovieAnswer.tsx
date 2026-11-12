"use client";
import type {CharacterImage,MovieSearchResult} from '@/types/chat';
import {useT} from '@/i18n/useT';
import {FormattedAnswer} from './FormattedAnswer';
import {MovieSearchCard} from './MovieSearchCard';
import {splitMovieAnswer} from './movie-answer-order';
import {UzbekMovieLinks} from './UzbekMovieLinks';

export function MovieAnswer({text,movie,characterImages}:{text:string;movie:MovieSearchResult;characterImages?:CharacterImage[]}){
 const t=useT();const parts=splitMovieAnswer(text);const full=!movie.presentation||movie.presentation==='full';
 if(movie.linksOnly)return <div><FormattedAnswer text={text}/><UzbekMovieLinks links={movie.uzbekLinks}/></div>;
 return <div className="space-y-4">
  {(full||movie.presentation==='brief'||movie.presentation==='details')&&parts.about&&<FormattedAnswer text={`### ${t('chat.movieAbout')}\n\n${parts.about}`} hideCitations/>}
  {movie.presentation==='trailer'&&<FormattedAnswer text={text}/>}
  <MovieSearchCard movie={movie} confirmation={full||movie.presentation==='brief'?(parts.confirmation||t('chat.movieConfirm')):undefined}>
   {(full||movie.presentation==='characters')&&parts.characters&&<div className="mt-5"><FormattedAnswer text={parts.characters} characterImages={characterImages} hideCitations/></div>}
   {(full||movie.presentation==='cast')&&parts.cast&&<div className="mt-5"><FormattedAnswer text={parts.cast} characterImages={characterImages} hideCitations/></div>}
  </MovieSearchCard>
 </div>;
}
