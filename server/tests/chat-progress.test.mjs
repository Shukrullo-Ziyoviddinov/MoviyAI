import {test} from 'node:test';import assert from 'node:assert/strict';
import {ChatFailure,chatFailureCode} from '../dist/ai/types/chat-progress.types.js';
test('confirmed failure codes survive without leaking provider text or confusing technical errors with unclear media',()=>{
 for(const code of ['insufficient_evidence','identity_unconfirmed','video_unreadable','timeout'])assert.equal(chatFailureCode(new ChatFailure(code)),code);
 assert.equal(chatFailureCode(Object.assign(Error('SECRET'),{name:'ApiError',status:503})),'provider_unavailable');
 assert.equal(chatFailureCode(Object.assign(Error('SECRET'),{status:503})),'unknown');
 assert.equal(chatFailureCode(Object.assign(Error('SECRET'),{status:429})),'rate_limited');
 assert.equal(chatFailureCode(Object.assign(Error('SECRET'),{name:'SerperError',status:503})),'search_unavailable');
 assert.equal(chatFailureCode(Object.assign(Error('SECRET'),{name:'TimeoutError'})),'timeout');
 for(const error of [Error('blurry video'),Object.assign(Error('cancelled'),{name:'AbortError'}),Object.assign(Error('secret'),{failureCode:'invented'})])assert.equal(chatFailureCode(error),'unknown');
});
