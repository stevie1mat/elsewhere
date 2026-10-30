import test from 'node:test';
import assert from 'node:assert/strict';
import {humanActionConstraints,humanActionIssue} from '../server/decision-check.js';
import {createResidentBrain} from '../server/groq.js';
import {createResident,stepResident} from '../server/resident.js';
import {createLocalClient} from '../server/local-client.js';

const correction='Dont search on youtube, there is place around you that has bike rentals, walk around and look for it';
const phone={action:'phone',destination:'here',seconds:60,mediaQuery:'bike rentals',goal:'Find a bicycle',intention:'Search for bikes',reply:"I'll walk to Porto Cycle House.",changePlan:false};
const visit={...phone,action:'visit',destination:'bikes',mediaQuery:'',changePlan:true,nextSteps:[]};
const ready=()=>{const s=createResident(0);s.arrival.phase='landed';s.obstacles=[];Object.assign(s.player,{x:32,z:6});return s;};

test('explicit phone prohibition persists through later chat and can be revoked',()=>{
 const messages=[{role:'user',content:correction},{role:'assistant',content:'Use phone'},{role:'user',content:'Hi'}];
 assert.equal(humanActionConstraints(messages).phoneAllowed,false);
 assert.equal(humanActionConstraints(messages,'Please use your phone to play music').phoneAllowed,true);
 const c=humanActionConstraints([],correction);
 assert.equal(c.travelDestination,'bikes');
 assert.match(humanActionIssue(phone,c,{chat:true}),/prohibited/);
 assert.match(humanActionIssue({...visit,changePlan:false},c,{chat:true}),/changePlan=true/);
 assert.match(humanActionIssue({...visit,destination:'garden'},c,{chat:true}),/destination=bikes/);
 assert.match(humanActionIssue({...visit,nextSteps:[phone]},c,{chat:true}),/prohibited/);
 assert.equal(humanActionIssue(visit,c,{chat:true}),null);
 assert.equal(humanActionConstraints([],'Where can I find bike rentals?').travelDestination,undefined);
});

test('repair replaces a false walking promise with a route that moves the character',async()=>{
 const s=ready();s.activity={kind:'phone'};s.rest=60;s.player.phone=true;
 let calls=0;const brain=createResidentBrain({now:()=>1000,client:{configured:true,complete:async(context,message)=>{
  calls++;assert.equal(context.humanActionConstraints.phoneAllowed,false);
  if(calls===1)return phone;
  assert.match(message,/failed the execution check/);return visit;
 }}});brain.initialize(s);
 await brain.chat(s,correction);
 assert.equal(calls,2);assert.equal(s.destination,'Porto Cycle House');assert.ok(s.route.length>0);
 assert.equal(s.rest,0);assert.equal(s.player.phone,undefined);
 const before={x:s.player.x,z:s.player.z};stepResident(s,.5,1500);
 assert.ok(s.player.moving);assert.ok(Math.hypot(s.player.x-before.x,s.player.z-before.z)>0);
 brain.stop();
});

test('unrepaired contradiction cannot send a false success reply or start a phone action',async()=>{
 const s=ready();const brain=createResidentBrain({now:()=>1000,client:{configured:true,complete:async()=>phone}});brain.initialize(s);
 await assert.rejects(brain.chat(s,correction),/prohibited/);
 assert.equal(s.messages.length,0);assert.equal(s.activity,undefined);brain.stop();
});

test('autonomous saved phone step is discarded after a human prohibition',async()=>{
 const s=ready();s.messages=[{role:'user',content:correction}];
 s.script={status:'running',cursor:0,steps:[phone],goal:'Find bikes'};
 const brain=createResidentBrain({now:()=>1000,client:{configured:true,complete:async()=>visit}});brain.initialize(s);s.ai.connected=true;
 await brain.update(s);assert.equal(s.pendingDecision.action,'visit');assert.equal(s.pendingDecision.destination,'bikes');brain.stop();
});

test('local decoder constrains an explicit bicycle trip and excludes prohibited phone follow-ups',async()=>{
 let body;const client=createLocalClient({fetchImpl:async(url,options)=>{
  body=JSON.parse(options.body);return Response.json({choices:[{finish_reason:'stop',text:JSON.stringify(visit)}]});
 }});
 await client.complete({conversation:[{role:'user',content:correction}]},'Chat with the human. Their message: '+correction);
 const schema=body.response_format.json_schema.schema;
 assert.deepEqual(schema.properties.action.enum,['visit']);assert.deepEqual(schema.properties.destination.enum,['bikes']);
 assert.deepEqual(schema.properties.changePlan.enum,[true]);assert.ok(!schema.properties.nextSteps.items.properties.action.enum.includes('phone'));
});
