import {useState} from 'react';
import {Linking,Pressable,Text,View} from 'react-native';
import {Image} from 'expo-image';
import YoutubePlayer from 'react-native-youtube-iframe';
import {useTranslation} from 'react-i18next';
import {useTheme} from '@/src/stores/useThemeStore';
import type {MovieTrailerData} from '@/src/types/chat';

function TrailerPlayer({trailer}:{trailer:MovieTrailerData}){
 const {colors}=useTheme();const {t}=useTranslation();const [active,setActive]=useState(false);const [failed,setFailed]=useState(false);const [width,setWidth]=useState(300);
 const height=Math.max(200,width*9/16);
 return <View onLayout={event=>setWidth(event.nativeEvent.layout.width)} style={{marginTop:16,width:'100%',maxWidth:640,borderWidth:1,borderColor:colors.borderSoft,borderRadius:16,overflow:'hidden',backgroundColor:colors.panel}}>
  <View style={{paddingHorizontal:16,paddingVertical:12}}><Text style={{color:colors.accentBright,fontSize:12,fontWeight:'600'}}>{t(trailer.kind==='trailer'?'chat.movieVideo.trailer':'chat.movieVideo.related')}</Text><Text style={{color:colors.text,fontSize:14,fontWeight:'600',marginTop:4}}>{trailer.title}</Text>{!!trailer.channel&&<Text style={{color:colors.textMuted,fontSize:12,marginTop:4}}>{trailer.channel}</Text>}</View>
  {failed?<Text style={{color:colors.textMuted,padding:16}}>{t('chat.movieVideo.unavailable')}</Text>:active?
   <YoutubePlayer height={height} width={Math.max(1,width-2)} videoId={trailer.videoId} play onError={()=>setFailed(true)} webViewProps={{allowsInlineMediaPlayback:true,mediaPlaybackRequiresUserAction:false,onError:()=>setFailed(true)}} initialPlayerParams={{controls:true,rel:false,preventFullScreen:false}}/>:
   <Pressable accessibilityRole="button" accessibilityLabel={t('chat.movieVideo.play')} onPress={()=>setActive(true)} style={{height,backgroundColor:'#000',alignItems:'center',justifyContent:'center'}}>
    <Image source={{uri:`https://i.ytimg.com/vi/${trailer.videoId}/hqdefault.jpg`}} contentFit="cover" style={{position:'absolute',width:'100%',height:'100%'}}/>
    <View style={{width:80,height:56,borderRadius:16,backgroundColor:'#dc2626',alignItems:'center',justifyContent:'center'}}><Text style={{color:'#fff',fontSize:25}}>▶</Text></View>
   </Pressable>}
  <Pressable accessibilityRole="link" onPress={()=>{void Linking.openURL(`https://www.youtube.com/watch?v=${trailer.videoId}`).catch(()=>undefined);}} style={{paddingHorizontal:16,paddingVertical:12}}><Text style={{color:colors.accentBright,fontSize:14,fontWeight:'600'}}>{t('chat.movieVideo.open')} ↗</Text></Pressable>
 </View>;
}
export function MovieTrailer({trailer}:{trailer?:MovieTrailerData|null}){
 return trailer&&/^[\w-]{11}$/.test(trailer.videoId)?<TrailerPlayer key={trailer.videoId} trailer={trailer}/>:null;
}
