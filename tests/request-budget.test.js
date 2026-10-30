import test from 'node:test';import assert from 'node:assert/strict';
import {rateLimitDetails} from '../server/rate-limits.js';import {compactContext} from '../server/compact-context.js';
test('daily quota and fractional reset duration are parsed without exposing account identifiers',()=>{
 const q=rateLimitDetails('Rate limit reached in org_secret on tokens per day (TPD): Limit 200000, Used 194474, Requested 5809. Please try again in 2m2.256s.',new Headers({'retry-after':'30'}));assert.deepEqual(q,{retryMs:122256,kind:'tokens per day',limit:200000,used:194474,requested:5809});assert.ok(!JSON.stringify(q).includes('org_secret'));
 assert.equal(rateLimitDetails('Rate limit exceeded',new Headers({'retry-after':'90'})).retryMs,90000);
});
test('compact request retains effects and active task evidence while eliminating repeated observations',()=>{
 const obj={id:'seat',name:'Chair',type:'chair',affordances:['sit'],metres:2,source:'geometric perception'};
 const c={perception:{objects:[obj]},task:{status:'active',metric:'energy',baseline:71,target:81,lastEvidence:{activity:'rest',before:{energy:71,thirst:84,hunger:60},after:{energy:87,thirst:87,hunger:62}}},measuredEffects:[{action:'rest',meanChanges:{energy:16,thirst:3},lastExample:{before:{energy:71,thirst:84},after:{energy:87,thirst:87},duration:120}}],needAwareness:{values:{thirst:87},unresolved:[{metric:'thirst',value:87,status:'No drinking'}]},memory:{knownObjects:[obj],lastObserved:{objects:[obj]}},lessonsForCurrentNeeds:[],conversation:[{role:'assistant',content:'Unverified old scenery'},{role:'user',content:'Raise energy by 10'}]};
 const x=compactContext(c);assert.equal(x.measuredEffects[0].lastExample.after.energy,87);assert.equal(x.measuredEffects[0].meanChanges.energy,16);assert.equal(x.task.target,81);assert.equal(x.task.lastEvidence.before.energy,71);assert.equal(x.needAwareness.unresolved[0].metric,'thirst');assert.equal(x.memory.knownObjects.length,0);assert.equal(x.memory.lastObserved,undefined);assert.deepEqual(x.conversation,[{role:'user',content:'Raise energy by 10'}]);assert.equal(c.memory.knownObjects.length,1);
});
