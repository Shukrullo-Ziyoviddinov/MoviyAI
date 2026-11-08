import {View} from 'react-native';
import {useTranslation} from 'react-i18next';
import type {CharacterImage,MovieSearchResult} from '@/src/types/chat';
import {FormattedAnswer} from './FormattedAnswer';
import {MovieSearchCard} from './MovieSearchCard';
import {splitMovieAnswer} from './movie-answer-order';

export function MovieAnswer({text,movie,characterImages}:{text:string;movie:MovieSearchResult;characterImages?:CharacterImage[]}){
 const {t}=useTranslation();const parts=splitMovieAnswer(text);
 return <View style={{gap:16}}>
  {!!parts.about&&<FormattedAnswer text={`### ${t('chat.movieAbout')}\n\n${parts.about}`} hideCitations/>}
  <MovieSearchCard movie={movie} confirmation={parts.confirmation||t('chat.movieConfirm')}>
   {!!parts.characters&&<View style={{marginTop:20}}><FormattedAnswer text={parts.characters} characterImages={characterImages} hideCitations/></View>}
   {!!parts.cast&&<View style={{marginTop:20}}><FormattedAnswer text={parts.cast} characterImages={characterImages} hideCitations/></View>}
  </MovieSearchCard>
 </View>;
}
