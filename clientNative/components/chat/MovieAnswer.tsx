import {View} from 'react-native';
import {useTranslation} from 'react-i18next';
import type {CharacterImage,MovieSearchResult} from '@/src/types/chat';
import {FormattedAnswer} from './FormattedAnswer';
import {MovieSearchCard} from './MovieSearchCard';
import {splitMovieAnswer} from './movie-answer-order';
import {UzbekMovieLinks} from './UzbekMovieLinks';

export function MovieAnswer({text,movie,characterImages}:{text:string;movie:MovieSearchResult;characterImages?:CharacterImage[]}){
 const {t}=useTranslation();const parts=splitMovieAnswer(text);const full=!movie.presentation||movie.presentation==='full';
 if(movie.linksOnly)return <View><FormattedAnswer text={text}/><UzbekMovieLinks links={movie.uzbekLinks}/></View>;
 return <View style={{gap:16}}>
  {(full||movie.presentation==='brief'||movie.presentation==='details')&&!!parts.about&&<FormattedAnswer text={`### ${t('chat.movieAbout')}\n\n${parts.about}`} hideCitations/>}
  {movie.presentation==='trailer'&&<FormattedAnswer text={text}/>}
  <MovieSearchCard movie={movie} confirmation={full||movie.presentation==='brief'?(parts.confirmation||t('chat.movieConfirm')):undefined}>
   {(full||movie.presentation==='characters')&&!!parts.characters&&<View style={{marginTop:20}}><FormattedAnswer text={parts.characters} characterImages={characterImages} hideCitations/></View>}
   {(full||movie.presentation==='cast')&&!!parts.cast&&<View style={{marginTop:20}}><FormattedAnswer text={parts.cast} characterImages={characterImages} hideCitations/></View>}
  </MovieSearchCard>
 </View>;
}
