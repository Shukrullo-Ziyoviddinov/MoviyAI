import {Linking,Pressable,Text,View} from 'react-native';
import {useTranslation} from 'react-i18next';
import type {MovieSearchResult} from '@/src/types/chat';
import {useTheme} from '@/src/stores/useThemeStore';

export function UzbekMovieLinks({links}:{links:MovieSearchResult['uzbekLinks']}) {
 const {colors}=useTheme();const {t}=useTranslation();if(!links?.length)return null;
 return <View style={{marginTop:24,borderRadius:16,borderWidth:1,borderColor:colors.accentBright,backgroundColor:colors.panelSoft,padding:16}}>
  <Text accessibilityRole="header" style={{color:colors.text,fontSize:18,fontWeight:'700'}}>▶ {t('chat.uzbekMovies.heading')}</Text>
  <Text style={{color:colors.textMuted,fontSize:12,lineHeight:20,marginTop:4}}>{t('chat.uzbekMovies.note')}</Text>
  {links.map(link=><Pressable key={link.url} accessibilityRole="link" accessibilityLabel={`${link.title}, ${link.site}, ${t('chat.uzbekMovies.open')}`} onPress={()=>{void Linking.openURL(link.url).catch(()=>undefined);}} style={{marginTop:12,padding:16,borderRadius:12,borderWidth:1,borderColor:colors.borderSoft,backgroundColor:colors.panel,flexDirection:'row',alignItems:'center',gap:12}}>
   <View style={{flex:1}}><Text style={{color:colors.text,fontSize:14,fontWeight:'600'}}>{link.title}</Text><Text style={{color:colors.textMuted,fontSize:12,marginTop:4}}>{link.site}</Text><Text style={{color:colors.accentBright,fontSize:12,fontWeight:'600',marginTop:8}}>{t('chat.uzbekMovies.open')}</Text></View><Text style={{color:colors.accentBright,fontSize:20}}>↗</Text>
  </Pressable>)}
 </View>;
}
