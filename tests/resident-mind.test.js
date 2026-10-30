import test from 'node:test';
import assert from 'node:assert/strict';
import {ensureMind,stepMind} from '../server/resident-mind.js';
import {createResident,applyResidentDecision,stepResident} from '../server/resident.js';
const person=()=>{const s=createResident();s.obstacles=[];s.arrival.phase='landed';ensureMind(s);return s;};
const decision=(action,destination='home',seconds=45)=>({action,destination,seconds,intention:`I want to ${action}.`});
test('old saves receive persistent needs and walking gradually consumes energy',()=>{
 const s=person();s.route=[{x:47,z:65}];const before=s.needs.energy;
 for(let i=0;i<100;i++)stepMind(s,.1);
 assert.ok(s.needs.energy<before);assert.ok(s.needs.hunger>25);assert.ok(s.needs.thirst>20);
 const restored=JSON.parse(JSON.stringify(s));ensureMind(restored);assert.deepEqual(restored.needs,s.needs);
});
test('meals cost money, reduce hunger and thirst, and finish with a real event',()=>{
 const s=person();s.player.x=31;s.player.z=10;s.needs.hunger=90;s.needs.thirst=80;
 applyResidentDecision(s,decision('eat','cafe'),0);assert.equal(s.wallet,16);
 for(let i=0;i<460;i++)stepResident(s,.1,i*100);
 assert.ok(s.needs.hunger<50);assert.ok(s.needs.thirst<50);assert.ok(s.events.some(e=>e.message.includes('Finished a meal')));
});
test('sleep travels home before recovery and work pays only after completion',()=>{
 const s=person();s.needs.energy=20;applyResidentDecision(s,decision('sleep','garden'),0);
 assert.equal(s.destination,'Casa Aurora');assert.equal(s.rest,0);assert.equal(s.activity,null);assert.ok(s.route.length);
 const w=person();w.player.x=31;w.player.z=10;applyResidentDecision(w,decision('work','cafe',30),0);assert.equal(w.wallet,20);
 for(let i=0;i<310;i++)stepResident(w,.1,i*100);
 assert.equal(w.wallet,28);assert.ok(w.experiences.some(e=>e.activity==='work'));
});
test('unaffordable meals preserve the active route and needs remain bounded',()=>{
 const s=person();s.wallet=0;const route=[{x:47,z:65}];s.route=route;
 assert.match(applyResidentDecision(s,decision('eat','cafe')).error,/€4/);assert.equal(s.route,route);
 for(let i=0;i<100;i++)stepMind(s,100);
 for(const value of Object.values(s.needs))assert.ok(value>=0&&value<=100);
});
