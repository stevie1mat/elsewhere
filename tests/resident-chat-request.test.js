import test from 'node:test';import assert from 'node:assert/strict';import {residentChatRequest} from '../src/resident-chat-request.js';
test('slow local chat is posted once and result is polled without duplicate AI requests',async()=>{
 const original=globalThis.fetch;let posts=0,polls=0;
 globalThis.fetch=async(url,o)=>{if(o?.method==='POST'){posts++;return Response.json({jobId:'job'},{status:202});}polls++;return Response.json({ai:{chatTask:{id:'job',status:'complete',reply:'Started phone search'}}});};
 try{const r=await residentChatRequest('Use phone');assert.equal((await r.json()).reply,'Started phone search');assert.equal(posts,1);assert.equal(polls,1);}finally{globalThis.fetch=original;}
});
