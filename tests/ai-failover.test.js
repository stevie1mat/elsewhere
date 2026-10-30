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
test('both APIs failing continues actual local movement and later resumes AI decisions',async()=>{
 let time=1000,healthy=false,calls=0;
 const client=createResilientClient({now:()=>time,clients:['Groq','Mistral'].map(provider=>({configured:true,provider,model:'test',complete:async()=>{calls++;if(!healthy)throw new GroqError('Timeout');return decision;}}))});
 const s=createResident();s.obstacles=[];s.arrival.phase='landed';const brain=createResidentBrain({client,now:()=>time});brain.initialize(s);
 await brain.update(s);assert.equal(s.ai.fallback,true);stepResident(s,.1,time);assert.ok(s.player.moving);assert.ok(s.route.length);
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
