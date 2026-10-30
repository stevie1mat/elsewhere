import test from 'node:test';
import assert from 'node:assert/strict';
import {createResident,stepResident} from '../server/resident.js';
import {ensureMind,startActivity} from '../server/resident-mind.js';
import {residentContext} from '../server/groq.js';
const person=()=>{const s=createResident();s.obstacles=[];s.arrival.phase='landed';s.player.x=19;s.player.z=-83;ensureMind(s);return s;};
test('bed sleep is reported as an interaction gap instead of a successful activity',()=>{
 const s=person();const result=startActivity(s,{action:'sleep',seconds:60,intention:'Lie down and sleep.'},{name:'Casa Aurora'},1000);
 assert.match(result.error,/No usable target/);assert.equal(s.activity,undefined);assert.equal(s.rest,0);assert.equal(s.worldRequests,undefined);
 const context=residentContext(s);assert.match(context.actionSupport.sleep,/registered home bed/);assert.equal(context.executionFeedback[0].status,'blocked');
});
test('standing rest is honest and does not repeatedly announce the same missing capability',()=>{
 const s=person(),d={action:'rest',seconds:60,intention:'Rest here.'};
 assert.equal(startActivity(s,d,null,1000).started,true);assert.equal(s.activity.executionMode,'standing_only');assert.match(s.thought,/resting on my feet/);
 startActivity(s,d,null,2000);assert.equal(s.worldRequests,undefined);assert.equal(s.messages,undefined);
 const seated=startActivity(s,{...d,intention:'Sit down on the chair.'},null,3000);assert.match(seated.error,/No usable target/);
});
test('legacy sleeping saves cannot recover energy or log a completed sleep while standing',()=>{
 const s=person();s.needs.energy=10;s.activity={kind:'sleep',remaining:30};s.rest=30;
 stepResident(s,.1,1000);assert.equal(s.needs.energy,10);assert.equal(s.activity,null);assert.equal(s.rest,0);assert.ok(!s.events.some(e=>/Finished sleep/.test(e.message)));assert.equal(s.worldRequests,undefined);
});
