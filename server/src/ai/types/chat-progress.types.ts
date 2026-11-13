export const CHAT_STAGES=['upload_video','upload_image','analyzing_video','analyzing_image','verifying','catalog','searching','uzbek_links','posters','preparing'] as const;
export type ChatStage=typeof CHAT_STAGES[number];
export type ChatProgress=(stage:ChatStage)=>void;
export const CHAT_FAILURES=['insufficient_evidence','identity_unconfirmed','provider_unavailable','search_unavailable','rate_limited','timeout','video_unreadable','unknown'] as const;
export type ChatFailureCode=typeof CHAT_FAILURES[number];
export class ChatFailure extends Error{
 constructor(public readonly failureCode:ChatFailureCode){super('CHAT_'+failureCode.toUpperCase());this.name='ChatFailure';}
}
export function chatFailureCode(error:unknown):ChatFailureCode{
 const item=error as {failureCode?:unknown;status?:number;name?:string;code?:string}|null;
 if(CHAT_FAILURES.includes(item?.failureCode as ChatFailureCode))return item!.failureCode as ChatFailureCode;
 if(item?.name==='TimeoutError'||item?.code==='ETIMEDOUT'||item?.code==='UND_ERR_CONNECT_TIMEOUT')return 'timeout';
 if(item?.status===429)return 'rate_limited';
 if(item?.name==='SerperError')return 'search_unavailable';
 if(['ApiError','AiServiceError'].includes(item?.name??'')&&[500,502,503,504].includes(item?.status??0))return 'provider_unavailable';
 return 'unknown';
}
