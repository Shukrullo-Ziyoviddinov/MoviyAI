import {useContext} from 'react';
import {Linking,Pressable,ScrollView,Text,View} from 'react-native';
import {Gesture,GestureDetector} from 'react-native-gesture-handler';
import {useTranslation} from 'react-i18next';
import {SideMenuGestureContext} from '@/components/menu/side-menu-gesture';
import {useTheme} from '@/src/stores/useThemeStore';
import type {MovieSearchResult} from '@/src/types/chat';
import {movieTableRows} from './movie-table';

export function MovieDetailsTable({movie}:{movie:MovieSearchResult}){
 const {colors}=useTheme();const {t}=useTranslation();
 const drawer=useContext(SideMenuGestureContext);
 const gesture=Gesture.Native();if(drawer)gesture.blocksExternalGesture(drawer);
 const rows=movieTableRows(movie,t('chat.movieTable.minute'));
 if(!rows.length)return null;
 return <View style={{marginTop:16,borderWidth:1,borderColor:colors.borderSoft,borderRadius:16,overflow:'hidden',backgroundColor:colors.panel}}>
  <View style={{paddingHorizontal:16,paddingVertical:14,borderBottomWidth:1,borderBottomColor:colors.borderSoft}}>
   <Text style={{color:colors.textMuted,fontSize:10,fontWeight:'600',letterSpacing:1.5,marginBottom:4}}>{t('chat.movieTable.title').toUpperCase()}</Text>
   <Text accessibilityRole="header" style={{color:colors.text,fontSize:16,lineHeight:24,fontWeight:'700'}}>{movie.title}{movie.year?` (${movie.year})`:''}</Text>
  </View>
  <GestureDetector gesture={gesture}>
   <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityLabel={t('chat.movieTable.title')}>
    <View style={{minWidth:540}}>{rows.map((row,index)=><View key={row.key} style={{flexDirection:'row',borderBottomWidth:index<rows.length-1?1:0,borderBottomColor:colors.borderSoft}}>
     <View style={{width:190,backgroundColor:colors.panelSoft,borderRightWidth:1,borderRightColor:colors.borderSoft,paddingHorizontal:16,paddingVertical:12,justifyContent:'center'}}>
      <Text style={{color:colors.textMuted,fontSize:13,lineHeight:24,fontWeight:'500'}}>{t('chat.movieTable.'+row.key)}</Text>
     </View>
     <View style={{minWidth:350,flexGrow:1,paddingHorizontal:16,paddingVertical:12,flexDirection:'row',alignItems:'center',gap:8}}>
      <Text selectable numberOfLines={1} style={{color:colors.text,fontSize:13,lineHeight:24,fontWeight:'500'}}>{row.value}</Text>
      {row.source&&<Pressable accessibilityRole="link" accessibilityLabel={t('chat.movieSources')} hitSlop={8} onPress={()=>{void Linking.openURL(row.source!).catch(()=>undefined);}}>
       <Text style={{color:colors.accentBright,fontSize:17}}>↗</Text>
      </Pressable>}
     </View>
    </View>)}</View>
   </ScrollView>
  </GestureDetector>
 </View>;
}
