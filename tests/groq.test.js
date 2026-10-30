import test from 'node:test';
import assert from 'node:assert/strict';
import {createGroqClient,createResidentBrain,validateDecision,GroqError} from '../server/groq.js';
import {createResident,stepResident} from '../server/resident.js';
const decision={action:'visit',destination:'garden',seconds:45,goal:'Explore a quiet place.',intention:'I want to see the garden.',reply:'I am heading to the garden for a walk.'};
const ready=()=>{const s=createResident(0);s.obstacles=[];s.arrival.phase='landed';return s;};
test('Groq request stays server-side, requests structured output, and rejects invalid actions',async()=>{
 let request;
 const client=createGroqClient({apiKey:'test-secret',fetchImpl:async(url,options)=>{request={url,...options};return {ok:true,json:async()=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify(decision)}}]})};}});
 assert.deepEqual(await client.complete({},'Decide'),decision);
 assert.equal(request.url,'https://api.groq.com/openai/v1/chat/completions');
 assert.equal(request.headers.Authorization,'Bearer test-secret');
 const body=JSON.parse(request.body);assert.equal(body.response_format.json_schema.strict,true);
 assert.throws(()=>validateDecision({...decision,destination:'invented-place'}));
 assert.throws(()=>validateDecision({...decision,action:'execute_code'}));
 assert.throws(()=>validateDecision({...decision,seconds:1000000}));
});
test('an AI choice drives the actual character instead of the fixed visit schedule',async()=>{
 const s=ready();let calls=0;const brain=createResidentBrain({client:{configured:true,model:'test',complete:async()=>{calls++;return decision;}},now:()=>1000});brain.initialize(s);
 stepResident(s,.1,1000);assert.equal(s.route.length,0,'wait for a model choice rather than choose a scripted destination');
 await brain.update(s);stepResident(s,.1,1100);
 assert.equal(s.destination,'Jardim do Sol');assert.equal(s.thought,decision.intention);assert.ok(s.route.length);assert.ok(s.player.moving);
 await brain.update(s);assert.equal(calls,1,'do not request another plan while walking');brain.stop();
});
test('rest decisions and chat are saved without chat replies executing actions',async()=>{
 let time=1000;const s=ready();const brain=createResidentBrain({client:{configured:true,model:'test',complete:async()=>({...decision,action:'rest',seconds:30})},now:()=>time});brain.initialize(s);
 await brain.update(s);stepResident(s,.1,time);assert.equal(s.rest,30);assert.equal(s.route.length,0);
 time+=6000;assert.equal(await brain.chat(s,'What are you planning?'),decision.reply);
 assert.equal(s.messages.length,2);assert.equal(s.messages[0].role,'user');assert.equal(s.rest,30);assert.equal(s.pendingDecision,undefined);
 const restored=JSON.parse(JSON.stringify(s));assert.equal(restored.messages[1].content,decision.reply);brain.stop();
});
test('usage limits back off, prevent overlapping requests and never reveal provider response bodies',async()=>{
 const client=createGroqClient({apiKey:'test-secret',fetchImpl:async()=>({ok:false,status:429,headers:new Headers({'retry-after':'120'}),text:async()=>{throw Error('must not read raw provider error');}})});
 await assert.rejects(client.complete({},'test'),e=>e.retryMs===120000&&!e.message.includes('test-secret'));
 let time=1000,calls=0;const s=ready();const brain=createResidentBrain({client:{configured:true,model:'test',complete:async()=>{calls++;throw new GroqError('Usage limit',{status:429,retryMs:120000});}},now:()=>time});brain.initialize(s);
 await brain.update(s);await brain.update(s);time+=119000;await brain.update(s);assert.equal(calls,1);time+=2000;await brain.update(s);assert.equal(calls,2);assert.equal(s.ai.status,'fallback');brain.stop();
});
test('stopping the brain discards pending decisions and prevents future requests',async()=>{
 let resolve;const s=ready();const brain=createResidentBrain({client:{configured:true,model:'test',complete:()=>new Promise(r=>{resolve=r;})},now:()=>1000});brain.initialize(s);
 const pending=brain.update(s);brain.stop();resolve(decision);await pending;assert.equal(s.pendingDecision,undefined);assert.equal(s.events.length,0);
});
