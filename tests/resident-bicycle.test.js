import test from 'node:test';
import assert from 'node:assert/strict';
import {createResident,applyResidentDecision,stepResident} from '../server/resident.js';
import {validateDecision} from '../server/decision-contract.js';
import {humanActionConstraints,humanActionIssue} from '../server/decision-check.js';

const d={action:'collect_bicycle',destination:'bikes',seconds:15,goal:'Get a bicycle',intention:'Collect and mount the loan bicycle.',reply:'I will collect the bicycle.',changePlan:true};
const ready=()=>{const s=createResident(0);s.arrival.phase='landed';s.obstacles=[];Object.assign(s.player,{x:32,z:6});return s;};
test('AI bicycle collection walks to shop then mounts an actual bicycle',()=>{
 const s=ready();assert.equal(validateDecision(d).action,'collect_bicycle');
 assert.equal(applyResidentDecision(s,d,0).started,true);assert.equal(s.player.mode,'walking');assert.ok(s.route.length);
 for(let n=1;n<400&&s.player.mode==='walking';n++)stepResident(s,.1,n*100);
 assert.equal(s.player.mode,'cycling');assert.equal(s.activity.kind,'collect_bicycle');
 assert.equal(s.activity.executionMode,'bicycle_pickup');assert.equal(s.wallet,20);assert.equal(s.route.length,0);
 assert.ok(s.events.some(e=>/Collected and mounted/.test(e.message)));
});
test('collection works immediately nearby and rejects duplicate bicycles or invalid destination',()=>{
 const s=ready();Object.assign(s.player,{x:30,z:-14,phone:true});s.rest=60;
 assert.equal(applyResidentDecision(s,d,0).started,true);assert.equal(s.player.mode,'cycling');assert.equal(s.player.phone,undefined);
 assert.match(applyResidentDecision(s,d,1).error,/already have/);
 assert.throws(()=>validateDecision({...d,destination:'garden'}),/destination/);
});
test('collection cannot fabricate a pickup through a blocked approach',()=>{
 const s=ready();Object.assign(s.player,{x:29,z:-15});s.obstacles=[{minX:28,maxX:30,minZ:-16,maxZ:-14}];
 assert.match(applyResidentDecision(s,d,0).error,/clear area/);assert.equal(s.player.mode,'walking');
});
test('an accepted get-bicycle request must collect rather than merely observe the shop',()=>{
 const c=humanActionConstraints([],'Lets go get a bicycle');
 assert.equal(c.travelAction,'collect_bicycle');assert.equal(humanActionIssue(d,c,{chat:true}),null);
 assert.match(humanActionIssue({...d,action:'visit'},c,{chat:true}),/action=collect_bicycle/);
});
