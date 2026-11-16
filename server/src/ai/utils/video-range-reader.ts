/** Batch tiny container-header reads; never download the complete media file. */
export function videoRangeReader(size:number,readRange:(offset:number,length:number)=>Promise<Buffer>) {
  const blocks=new Map<number,Buffer>();
  const blockSize=4096,maxBytes=128*1024;
  let fetched=0;
  return async(offset:number,length:number):Promise<Buffer>=>{
    if(!Number.isSafeInteger(offset)||!Number.isSafeInteger(length)||offset<0||length<=0||length>65536||offset+length>size)
      throw Error('INVALID_VIDEO_RANGE');
    const chunks:Buffer[]=[];
    for(let at=offset;at<offset+length;){
      const start=Math.floor(at/blockSize)*blockSize;
      let block=blocks.get(start);
      if(!block){
        const count=Math.min(blockSize,size-start);
        if(fetched+count>maxBytes)throw Error('VIDEO_METADATA_LIMIT');
        fetched+=count;block=await readRange(start,count);
        if(block.length!==count)throw Error('INVALID_VIDEO_RANGE');
        blocks.set(start,block);
      }
      const end=Math.min(block.length,offset+length-start);
      chunks.push(block.subarray(at-start,end));at=start+end;
    }
    return chunks.length===1?chunks[0]:Buffer.concat(chunks);
  };
}
