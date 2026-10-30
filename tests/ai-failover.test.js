import test from 'node:test';
import assert from 'node:assert/strict';
import {createMistralClient,createResilientClient,createResidentBrain,GroqError} from '../server/groq.js';
import {createResident,stepResident} from '../server/resident.js';
const decision={action:'visit',destination:'home',seconds:45,goal:'Find my home.',intention:'I am going home.',reply:'I want to settle in.'};
test('a failed primary request immediately uses Mistral and stays on the healthy provider',async()=>{
 let time=1000;const calls=[];
 const client=createResilientClient({now:()=>time,clients:[
  {configured:true,provider:'Groq',model:'g',complete:async()=>{calls.push('Groq');throw new GroqError('Timeout');}},
  {configured:true,provider:'Mistral',model:'m',complete:async()=>{calls.push('Mistral');return decision;}}
 ]});
 assert.deepEqual(await client.complete({},'decide'),decision);assert.deepEqual(calls,['Groq','Mistral']);assert.equal(client.provider,'Mistral');
 time+=6000;await client.complete({},'chat');assert.deepEqual(calls,['Groq','Mistral','Mistral']);
});
test('when the second provider fails it switches back to the recovered primary',async()=>{
 let time=0,failMistral=false,calls=[];
 const client=createResilientClient({now:()=>time,clients:[
  {configured:true,provider:'Groq',model:'g',complete:async()=>{calls.push('g');if(time===0)throw new GroqError('429',{retryMs:60000});return decision;}},
  {configured:true,provider:'Mistral',model:'m',complete:async()=>{calls.push('m');if(failMistral)throw new GroqError('Timeout');return decision;}}
 ]});
 await client.complete({},'decide');time=61000;failMistral=true;await client.complete({},'decide');assert.equal(client.provider,'Groq');assert.deepEqual(calls,['g','m','m','g']);
});
test('both APIs failing freezes character and memories, then resumes on recovery',async()=>{
 let time=1000,healthy=false,calls=0;
 const client=createResilientClient({now:()=>time,clients:['Groq','Mistral'].map(provider=>({configured:true,provider,model:'test',complete:async()=>{calls++;if(!healthy)throw new GroqError('Timeout');return decision;}}))});
 const s=createResident();s.obstacles=[];s.arrival.phase='landed';const brain=createResidentBrain({client,now:()=>time});brain.initialize(s);
 await brain.update(s);assert.equal(s.ai.connected,false);const before=JSON.stringify({player:s.player,events:s.events,needs:s.needs});stepResident(s,.1,time);assert.equal(s.player.moving,false);assert.equal(s.route.length,0);assert.equal(JSON.stringify({player:s.player,events:s.events,needs:s.needs}),before);
 for(let i=0;i<500;i++)await brain.update(s);assert.equal(calls,2,'no API storm while walking');
 time+=180000;healthy=true;s.route=[];s.rest=0;await brain.update(s);assert.equal(s.ai.fallback,false);assert.equal(s.pendingDecision.destination,'home');brain.stop();
});
test('Mistral uses its own endpoint, JSON mode, and the same validated action contract',async()=>{
 let request;
 const client=createMistralClient({apiKey:'test-secret',fetchImpl:async(url,options)=>{request={url,...options};return {ok:true,json:async()=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify(decision)}}]})};}});
 assert.deepEqual(await client.complete({},'test'),decision);assert.equal(request.url,'https://api.mistral.ai/v1/chat/completions');assert.equal(JSON.parse(request.body).response_format.type,'json_object');
});
test('shutdown cancellation does not launch a backup request',async()=>{
 const controller=new AbortController();let backup=0;
 const client=createResilientClient({clients:[{configured:true,provider:'Groq',complete:async()=>{controller.abort();throw Error('aborted');}},{configured:true,provider:'Mistral',complete:async()=>{backup++;return decision;}}]});
 await assert.rejects(client.complete({},'test',controller.signal));assert.equal(backup,0);
});
test('reconnection verifies AI even with an existing route and preserves it without new memories',async()=>{
 const s=createResident();s.obstacles=[];s.arrival.phase='landed';s.route=[{x:47,z:65}];s.rest=20;const route=s.route;
 const brain=createResidentBrain({client:{configured:true,provider:'Groq',model:'test',complete:async()=>decision},now:()=>1000});brain.initialize(s);
 stepResident(s,.1,1000);assert.equal(s.rest,20);assert.equal(s.events.length,0);
 await brain.update(s);assert.equal(s.ai.connected,true);assert.equal(s.route,route);assert.equal(s.rest,20);assert.equal(s.events.length,0);assert.equal(s.pendingDecision,undefined);brain.stop();
});
test('disconnected arrival and needs remain frozen instead of falling back to a routine',()=>{
 const s=createResident();s.obstacles=[];s.ai={enabled:true,connected:false};s.needs={energy:50,hunger:50,thirst:50,stress:20,curiosity:50,social:50};
 const before=JSON.stringify({arrival:s.arrival,needs:s.needs,events:s.events});
 for(let i=0;i<100;i++)stepResident(s,.1,i*100);
 assert.equal(JSON.stringify({arrival:s.arrival,needs:s.needs,events:s.events}),before);assert.equal(s.player.moving,false);
});
test('reconnect keeps the final nine seconds of a saved shift and explicitly avoids recreating it',async()=>{
 const s=createResident();s.obstacles=[];s.arrival.phase='landed';s.rest=9;s.activity={kind:'work',remaining:9,total:180};let message;
 const brain=createResidentBrain({client:{configured:true,model:'test',complete:async(c,m)=>{message=m;return {...decision,seconds:15};}},now:()=>1000});brain.initialize(s);
 await brain.update(s);assert.equal(s.ai.connected,true);assert.equal(s.rest,9);assert.equal(s.activity.remaining,9);assert.equal(s.pendingDecision,undefined);assert.match(message,/seconds=15..180/);assert.match(message,/ignored while the existing activity resumes/);brain.stop();
});
