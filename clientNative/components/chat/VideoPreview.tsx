import {StyleSheet,View} from 'react-native';
import WebView from 'react-native-webview';
import {videoPageLocation} from './video-page';
import {videoHtml} from './video-html';

export function VideoPreview({uri}:{uri:string}){
 const page=videoPageLocation(uri);
 return <View style={StyleSheet.absoluteFill} pointerEvents="none"><WebView source={{html:videoHtml(page.source,true),baseUrl:page.dir}} style={StyleSheet.absoluteFill} originWhitelist={['*']} allowFileAccess allowFileAccessFromFileURLs allowUniversalAccessFromFileURLs allowingReadAccessToURL={page.dir} mediaPlaybackRequiresUserAction={false} allowsInlineMediaPlayback javaScriptEnabled scrollEnabled={false} cacheMode="LOAD_NO_CACHE"/></View>;
}
