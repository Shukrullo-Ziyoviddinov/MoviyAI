import {test} from 'node:test';import assert from 'node:assert/strict';
import {createCatalogWatchLinkSaver} from '../dist/ai/catalog/services/catalog-watch-links.service.js';
const first='https://asilmedia.org/123-film.html',second='https://uzmovi.net/123-film.html';
const movie={title:'Example',titleUz:'Misol',titleRu:null,year:2014,confidence:'high',sources:[],posters:[],linksOnly:true,uzbekLinks:[{url:first,title:'Misol',site:'asilmedia.org'},{url:second,title:'Misol',site:'uzmovi.net'},{url:first,title:'Misol',site:'asilmedia.org'}]};
test('link-only follow-ups add every new alternative to the verified existing movie',async()=>{
 const added=[];const save=createCatalogWatchLinkSaver({match:async()=>({status:'existing',id:8001}),add:async(id,urls)=>added.push({id,urls})});
 await save(movie);assert.deepEqual(added,[{id:8001,urls:[first,second]}]);
});
test('unmatched films and low-confidence or unsafe links do not update another movie',async()=>{
 let added=0,matched=0;
 const save=createCatalogWatchLinkSaver({match:async()=>{matched++;return {status:'new'};},add:async()=>{added++;}});
 await save(movie);await save({...movie,confidence:'low'});await save({...movie,uzbekLinks:[{url:'javascript:alert(1)',title:'bad',site:'bad'}]});
 assert.equal(added,0);assert.equal(matched,1);
});
