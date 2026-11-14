const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),ts=require('typescript');
const {webcrypto}=require('node:crypto');
function load(root){
 const requests=[];const exports={};let failPut=false;
 const perform=async(url,options)=>{requests.push({url,options});if(options.method==='PUT')return {ok:!failPut};return {ok:true,json:async()=>({ok:true,data:[{url:'https://r2.example/upload',headers:{'Content-Type':'image/jpeg','Cache-Control':'private, no-store'}}]})};};
 class LocalFile extends Blob {constructor(uri){super(['image'],{type:'image/jpeg'});this.uri=uri;}}
 const api={post:async(url,body)=>{requests.push({url,options:{body:JSON.stringify(body)}});return {data:{ok:true,data:[{url:'https://r2.example/upload',headers:{'Content-Type':'image/jpeg'}}]}}}};
 const source=fs.readFileSync(path.join(__dirname,'../../'+root+'/src/api/chat.ts'),'utf8');
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{
  exports,AbortSignal,Blob,Uint8Array,crypto:webcrypto,fetch:perform,
  require:name=>name==='expo-file-system'?{File:LocalFile}:name==='expo-crypto'?{CryptoDigestAlgorithm:{SHA256:'SHA-256'},digest:(_algorithm,bytes)=>webcrypto.subtle.digest('SHA-256',bytes)}:name==='expo/fetch'?{fetch:perform}:name.includes('chat-stream')?{consumeChatStream:async()=>({id:'chat',turns:[]})}:name.includes('authToken')?{getAuthTokenSync:()=> 'token'}:name.includes('storage')?{getSecureItem:async()=> 'token'}:{api,apiBaseUrl:'https://api.example.com',readAuthToken:()=> 'token'},
 });
 return {...exports,requests,failPut:()=>{failPut=true;}};
}
for(const root of ['client','clientNative'])test(root+' uploads bytes only to R2; Render receives JSON metadata and message',async()=>{
 const api=load(root);const file=new Blob(['image'],{type:'image/jpeg'});
 await api.sendChat('chat','request','Find movie',()=>{},[{id:'i',type:'image',uri:'file://frame.jpg',...(root==='client'?{file}:{}),mimeType:'image/jpeg'}]);
 const [reservation,upload,message]=api.requests;
 assert.ok(reservation.url.endsWith('/uploads'));const metadata=JSON.parse(reservation.options.body);assert.equal(metadata.images[0].hash.length,64);assert.equal(metadata.images[0].size,5);
 assert.equal(upload.url,'https://r2.example/upload');assert.equal(upload.options.method,'PUT');assert.equal(upload.options.headers.Authorization,undefined);
 const uploadedText=upload.options.body instanceof Blob?await upload.options.body.text():new TextDecoder().decode(upload.options.body);
 assert.equal(uploadedText,'image');
 assert.equal(message.options.headers['Content-Type'],'application/json');assert.equal(JSON.parse(message.options.body).directImages,true);
 assert.equal(api.chatMediaUrl('https://r2.example/image'),'https://r2.example/image');
});
test('failed R2 PUT does not start AI processing',async()=>{
 const api=load('client');api.failPut();await assert.rejects(()=>api.sendChat('chat','request','Find',()=>{},[{id:'i',type:'image',uri:'blob:x',file:new Blob(['image'],{type:'image/jpeg'})}]));assert.equal(api.requests.length,2);
});
test('restored-image retry sends only the request identity',async()=>{
 const api=load('client');await api.sendChat('chat','request','Find',()=>{},[{id:'i',type:'image',uri:'https://r2.example/signed',stored:true}]);assert.equal(api.requests.length,1);assert.equal(JSON.parse(api.requests[0].options.body).directImages,undefined);
});
