"use client";
import type {CharacterImage,MovieSearchResult} from '@/types/chat';
import {useT} from '@/i18n/useT';
import {FormattedAnswer} from './FormattedAnswer';
import {MovieSearchCard} from './MovieSearchCard';
import {splitMovieAnswer} from './movie-answer-order';
import {UzbekMovieLinks} from './UzbekMovieLinks';

export function MovieAnswer({text,movie,characterImages}:{text:string;movie:MovieSearchResult;characterImages?:CharacterImage[]}){
 const t=useT();const parts=splitMovieAnswer(text);
 if(movie.linksOnly)return <div><FormattedAnswer text={text}/><UzbekMovieLinks links={movie.uzbekLinks}/></div>;
 return <div className="space-y-4">
  {parts.about&&<FormattedAnswer text={`### ${t('chat.movieAbout')}\n\n${parts.about}`} hideCitations/>}
  <MovieSearchCard movie={movie} confirmation={parts.confirmation||t('chat.movieConfirm')}>
   {parts.characters&&<div className="mt-5"><FormattedAnswer text={parts.characters} characterImages={characterImages} hideCitations/></div>}
   {parts.cast&&<div className="mt-5"><FormattedAnswer text={parts.cast} characterImages={characterImages} hideCitations/></div>}
  </MovieSearchCard>
 </div>;
}
