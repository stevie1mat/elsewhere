import test from 'node:test';
import assert from 'node:assert/strict';
import {perception,cachedMemory,groundedRecall} from '../server/cognition.js';
import {createResident} from '../server/resident.js';
import {ensureMind,startActivity,stepMind,finishActivity} from '../server/resident-mind.js';
import {createResidentBrain,residentContext} from '../server/groq.js';
const person=()=>{const s=createResident();s.obstacles=[];s.arrival.phase='landed';s.player.x=40;s.player.z=310;ensureMind(s);return s;};
test('perception and recall report simulation facts rather than invented scenery',()=>{
 const s=person(),p=perception(s);assert.equal(p.nearbyPlaces[0].name,'Costa Dourada');assert.ok(p.unavailable.includes('sounds'));
 const reply=groundedRecall(s,'What did you see?');assert.match(reply,/Costa Dourada/);assert.match(reply,/can't verify/);assert.ok(!reply.includes('gulls'));
 assert.equal(groundedRecall(s,'Can we walk to the beach?'),null);
});
test('outcomes teach that an unnecessary meal is less useful than one when hungry',()=>{
 function meal(hunger,thirst){const s=person();s.needs.hunger=hunger;s.needs.thirst=thirst;startActivity(s,{action:'eat',seconds:60,intention:'Eat'},{name:'Café Luma'},0);for(let i=0;i<600;i++)stepMind(s,.1);finishActivity(s,60000);return s;}
 const unnecessary=meal(14,25),useful=meal(90,85);
 assert.ok(unnecessary.outcomes[0].reward<0);assert.ok(useful.outcomes[0].reward>0);assert.ok(useful.outcomes[0].reward>unnecessary.outcomes[0].reward);
 assert.equal(useful.learning.preferences['eat|Café Luma'].count,1);
 const restored=JSON.parse(JSON.stringify(useful));assert.equal(cachedMemory(restored).outcomesLearned,1);
});
test('memory summary is reused until observed facts or measured outcomes change',()=>{
 const s=person();const first=cachedMemory(s);assert.equal(cachedMemory(s),first);assert.equal(s.memoryCache.builds,1);assert.equal(s.memoryCache.hits,1);
 startActivity(s,{action:'observe',seconds:30,intention:'Look around'},null,1000);const changed=cachedMemory(s);assert.notEqual(changed,first);assert.equal(s.memoryCache.builds,2);
});
test('factual perception questions use cached game facts with no model request',async()=>{
 const s=person();let calls=0;const brain=createResidentBrain({client:{configured:true,model:'test',complete:async()=>{calls++;throw Error('must not call');}}});brain.initialize(s);s.ai.connected=true;
 const reply=await brain.chat(s,'Did you see gulls?');assert.equal(calls,0);assert.match(reply,/can't verify/);assert.equal(s.ai.localRecallHits,1);brain.stop();
});
test('compact context rounds needs and bounds old conversation and event repetition',()=>{
 const s=person();s.needs.energy=78.2222222222;s.messages=Array.from({length:100},()=>({role:'user',content:'a'.repeat(1200)}));s.events=Array.from({length:500},()=>({message:'event'}));
 const context=residentContext(s);assert.equal(context.needs.energy,78);assert.equal(context.conversation.length,6);assert.equal(context.conversation[0].content.length,400);assert.equal(context.recentEvents.length,4);assert.equal(context.recentExperiences,undefined);
});
