export function splitMovieAnswer(text:string){
 const parts={about:[] as string[],characters:[] as string[],cast:[] as string[],confirmation:''};
 let section:'about'|'characters'|'cast'='about';
 for(const line of text.split('\n')){
  const plain=line.trim().replace(/^\*\*|\*\*$/g,'');
  if(/^(?:Siz izlagan kino shumi\?|Это тот фильм, который вы искали\?|Is this the film you were looking for\?)$/i.test(plain)){
   parts.confirmation=plain;continue;
  }
  const heading=/^(?:#{1,6}\s+|\*\*)(.+?)(?:\*\*)?$/.exec(line.trim())?.[1]?.replace(/[:：]$/,'').trim();
  if(heading){
   if(/^(?:asosiy qahramonlar|main characters|главные герои|основные персонажи)$/i.test(heading))section='characters';
   else if(/^(?:asosiy aktyorlar|main cast|главные акт[её]ры)$/i.test(heading))section='cast';
   else {section='about';if(/^(?:mazmuni|сюжет|plot|kino haqida|о фильме|about the film)(?:\s|$)/i.test(heading))continue;}
  }
  parts[section].push(line);
 }
 return {about:parts.about.join('\n').trim(),characters:parts.characters.join('\n').trim(),cast:parts.cast.join('\n').trim(),confirmation:parts.confirmation};
}
