import { Pressable, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/src/stores/useThemeStore';
type Props = {
  pinned:boolean; onPin:()=>void; pinError:boolean;
  title:string; active:boolean; disabled:boolean; deleting:boolean; error:boolean;
  menuOpen:boolean; onMenu:()=>void; onClose:()=>void; onOpen:()=>void; onDelete:()=>void;
};
export function ChatHistoryItem(props:Props) {
  const {colors}=useTheme();const {t}=useTranslation();
  return <View style={{marginBottom:4}}>
    <Pressable disabled={props.disabled} delayLongPress={500} onLongPress={props.onMenu}
      onPress={()=>{if(props.menuOpen)props.onClose();else props.onOpen();}}
      accessibilityRole="button" accessibilityHint={t('menu.chatActionsHint')}
      accessibilityActions={[{name:'longpress',label:t('menu.chatActionsHint')}]}
      onAccessibilityAction={event=>{if(event.nativeEvent.actionName==='longpress')props.onMenu();}}
      style={{padding:10,borderRadius:12,backgroundColor:props.active?colors.panelSoft:undefined,flexDirection:'row',alignItems:'center',gap:8}}>
      {props.pinned && <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={colors.textMuted} strokeWidth={1.6}><Path d="M20 15a3 3 0 0 1-3 3H8l-5 3V6a3 3 0 0 1 3-3h11a3 3 0 0 1 3 3Z" strokeLinejoin="round"/><Path d="M7 8h9M7 12h6" strokeLinecap="round"/></Svg>}
      <Text numberOfLines={1} style={{color:colors.textMuted,flex:1}}>{props.title}</Text>
    </Pressable>
    {props.menuOpen && <View style={{marginTop:4,padding:4,borderWidth:1,borderRadius:12,borderColor:colors.borderSoft,backgroundColor:colors.panelSoft}}>
      <Pressable onPress={props.onPin} disabled={props.disabled} accessibilityRole="button" accessibilityLabel={t(props.pinned?'common.unpin':'common.pin')}
        style={{minHeight:44,flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:12,paddingVertical:8,opacity:props.disabled?0.4:1}}>
        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><Path d="m16 3 5 5-4 1-3 5v3l-3-3-5 5-1-1 5-5-3-3h3l5-3Z"/>{props.pinned && <Path d="m3 3 18 18"/>}</Svg>
        <Text style={{color:colors.text,fontSize:14,fontWeight:'500'}}>{t(props.pinned?'common.unpin':'common.pin')}</Text>
      </Pressable>
      <Pressable onPress={props.onDelete} disabled={props.disabled||props.deleting} accessibilityRole="button" accessibilityLabel={t('common.delete')}
        style={({pressed})=>({minHeight:44,flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:12,paddingVertical:8,borderRadius:8,opacity:props.deleting?0.4:pressed?0.7:1})}>
        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M3 6h18M9 6V4h6v2M5 6l1 14h12l1-14M10 10v6M14 10v6"/>
        </Svg>
        <Text style={{color:'#ef4444',fontSize:14,fontWeight:'500'}}>{t(props.deleting?'common.deleting':'common.delete')}</Text>
      </Pressable>
      {props.error && <Text accessibilityRole="alert" style={{color:'#ef4444',padding:10,fontSize:12}}>{t('menu.deleteChatError')}</Text>}
      {props.pinError && <Text accessibilityRole="alert" style={{color:'#ef4444',padding:10,fontSize:12}}>{t('menu.pinChatError')}</Text>}
    </View>}
  </View>;
}
