const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const crypto=require('node:crypto');
function load(path,mocks={}){
 const module={exports:{}};
 const source=ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 new Function('require','exports','module',source)(name=>Object.hasOwn(mocks,name)?mocks[name]:require(name),module.exports,module);
 return module.exports;
}
// Exercise the installed Expo body/header normalization, not a replacement fetch implementation.
const expo=load('node_modules/expo/src/winter/fetch/RequestUtils.ts',{
 './convertFormData':{convertFormDataAsync(){throw Error('Unexpected multipart upload');}},
 '../../utils/blobUtils':{blobToArrayBufferAsync:blob=>blob.arrayBuffer()},
});
const nativeCrypto=load('node_modules/expo-crypto/src/Crypto.ts',{
 'expo-modules-core':{UnavailabilityError:Error},
 './Crypto.types':load('node_modules/expo-crypto/src/Crypto.types.ts'),
 './aes':{},
 './ExpoCrypto':{__esModule:true,default:{digest(algorithm,output,input){
  // Android CryptoModule.digest declares both output and data as TypedArray.
  assert.ok(ArrayBuffer.isView(input),'Android digest requires TypedArray, not ArrayBuffer');
  output.set(crypto.createHash('sha256').update(new Uint8Array(input.buffer,input.byteOffset,input.byteLength)).digest());
 }}},
});
function harness({rejectUpload=false}={}){
 const bytes=Uint8Array.from([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]);
 class LocalFile {
  constructor(uri){this.uri=uri;this.type='application/octet-stream';this.size=bytes.byteLength;}
  async arrayBuffer(){return bytes.slice().buffer;}
 }
 const uploads=[],messages=[],reservations=[];
 const chat=load('src/api/chat.ts',{
  'expo-file-system':{File:LocalFile},
  'expo-crypto':nativeCrypto,
  '@/src/utils/authToken':{getAuthTokenSync:()=> 'test-token',getAuthTokenKey:()=> 'token'},
  '@/src/utils/storage':{getSecureItem:async()=>null},
  '../media/prepare-chat-video':{prepareChatVideo:async()=>new LocalFile('file://compressed.mp4')},
  './chat-stream':{consumeChatStream:async()=>({id:'chat',turns:[]})},
  './client':{apiBaseUrl:'https://api.test',api:{post:async(path,body)=>{
   reservations.push(body);
   const mimeType=body.video?.mimeType??body.images[0].mimeType;
   const descriptor={url:'https://r2.test/upload',headers:{'Content-Type':mimeType,'Cache-Control':'private, no-store'}};
   return {data:{ok:true,data:body.video?descriptor:[descriptor]}};
  }}},
  'expo/fetch':{fetch:async(url,options)=>{
   if(options.method==='PUT'){
    const normalized=await expo.normalizeBodyInitAsync(options.body);
    const headers=expo.overrideHeaders(expo.normalizeHeadersInit(options.headers),normalized.overriddenHeaders??[]);
    uploads.push({headers:Object.fromEntries(headers),bytes:Array.from(normalized.body)});
    return {ok:!rejectUpload};
   }
   messages.push(JSON.parse(options.body));return {ok:true};
  }},
 });
 return {chat,bytes,uploads,messages,reservations};
}
for(const type of ['image','video'])test(`${type} upload preserves signed MIME and exact hashed bytes through Expo normalization`,async()=>{
 const h=harness();
 await h.chat.sendChat('chat','request','Find movie',()=>{},[{id:'media',uri:`file://picked.${type==='video'?'mov':'jpg'}`,type,mimeType:type==='video'?'video/quicktime':'image/jpeg'}]);
 assert.equal(h.uploads.length,1);
 assert.equal(h.uploads[0].headers['Content-Type'],type==='video'?'video/mp4':'image/jpeg');
 assert.deepEqual(h.uploads[0].bytes,Array.from(h.bytes));
 const reservation=h.reservations[0].video??h.reservations[0].images[0];
 assert.equal(reservation.size,h.bytes.byteLength);
 assert.equal(reservation.hash,crypto.createHash('sha256').update(h.bytes).digest('hex'));
 assert.equal(h.messages[0][type==='video'?'directVideo':'directImages'],true);
});
test('a rejected R2 upload stops before movie analysis with upload_failed',async()=>{
 const h=harness({rejectUpload:true});
 await assert.rejects(h.chat.sendChat('chat','request','Find movie',()=>{},[{id:'media',uri:'file://photo.jpg',type:'image',mimeType:'image/jpeg'}]),error=>error.failureCode==='upload_failed');
 assert.equal(h.messages.length,0);
});
