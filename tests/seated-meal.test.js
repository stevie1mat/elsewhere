import test from 'node:test';import assert from 'node:assert/strict';
import {createResident,applyResidentDecision,stepResident} from '../server/resident.js';
import {createResidentBrain} from '../server/groq.js';
import {parseHumanCommand} from '../server/human-command.js';
import {SERVICES} from '../server/shared/services.js';
import {ensureMind} from '../server/resident-mind.js';
import {executionAnswer} from '../server/execution-replies.js';
import {decisionIssue} from '../server/decision-check.js';
const original='You should get down from your bike and sit on the chair when eating';
const chair={id:'chair',name:'Café chair',type:'chair',x:31,y:.52,z:10,yaw:0,approach:{x:32.4,z:10},affordances:['sit']};
const ready=()=>{const s=createResident(0);s.arrival.phase='landed';s.obstacles=[];s.objects=[...SERVICES,chair];s.ai={enabled:true,connected:true};Object.assign(s.player,{x:32,z:9,mode:'cycling'});ensureMind(s);s.needs.hunger=90;return s;};
const advance=(s,t)=>{for(let i=0;i<t*20;i++)stepResident(s,.05,2000+i*50);};
test('original compound request is seated eating, never bicycle acquisition',()=>{
 const s=ready(),d=parseHumanCommand(s,original);assert.equal(d.action,'eat');assert.equal(d.parameters.value,'seated');
 for(const text of ['get down from your bike','get off the bike'])assert.equal(parseHumanCommand(s,text).action,'dismount');
 assert.equal(parseHumanCommand(s,'Lets go get a bicycle').action,'collect_bicycle');assert.equal(parseHumanCommand(s,'I dont see you getting down from the bike'),null);
});
test('compound command parks, picks up one meal, walks to chair, sits, consumes and stands',()=>{
 const s=ready(),before=s.wallet;const d=parseHumanCommand(s,original);assert.equal(applyResidentDecision(s,d,1000).started,true);assert.equal(s.player.mode,'walking');assert.ok(s.player.bike);
 let seated=false;for(let i=0;i<800;i++){stepResident(s,.05,2000+i*50);if(s.player.consuming==='eat'){seated=true;assert.equal(s.player.interactionPose.kind,'sit');assert.equal(s.player.mode,'walking');}}
 assert.ok(seated);assert.equal(s.wallet,before-4);assert.ok(s.needs.hunger<80);assert.equal(s.player.interactionPose,undefined);assert.equal(s.mealOrder,undefined);assert.equal(s.commandTask.status,'achieved');
});
test('missing seat is explained before buying or pretending to eat',()=>{
 const s=ready();s.objects=SERVICES;const wallet=s.wallet;const result=applyResidentDecision(s,parseHumanCommand(s,original),1000);
 assert.match(result.error,/no usable, reachable chair/);assert.equal(s.wallet,wallet);assert.equal(s.player.mode,'cycling');assert.equal(s.lastRejectedCommand.action,'eat');assert.equal(s.executionFeedback.at(-1).status,'blocked');
 const answer=executionAnswer(s,'Are you missing something?');assert.match(answer,/No usable café chair/);assert.match(answer,/Last execution blocker/);
});
test('interrupted seated meal survives save/restore and resumes without a second charge',()=>{
 let s=ready();const d=parseHumanCommand(s,original);applyResidentDecision(s,d,1000);
 for(let i=0;i<300&&!s.player.consuming;i++)stepResident(s,.05,2000+i*50);
 advance(s,4);const remaining=s.rest;applyResidentDecision(s,{action:'stop',destination:'here',seconds:15,intention:'Stop'},20000);assert.equal(s.mealOrder.remaining,remaining);
 s=JSON.parse(JSON.stringify(s));applyResidentDecision(s,d,21000);advance(s,20);assert.equal(s.wallet,16);assert.equal(s.mealOrder,undefined);
});
test('why/missing and acknowledgement questions report body state without model hallucinations',async()=>{
 const s=ready();s.activity={kind:'observe'};let calls=0;const brain=createResidentBrain({client:{configured:true,complete:async()=>{calls++;throw Error('not needed');}}});brain.initialize(s);
 for(const message of ['I dont see you getting down from the bike? Are you missing something?','Why did you not get down from the bike to sit and eat?','Did you get this?']){const reply=await brain.chat(s,message);assert.match(reply,/still mounted/);assert.match(reply,/not eating/);assert.ok(!reply.includes('Traffic was heavy'));}
 assert.equal(calls,0);brain.stop();
});
test('food claims require executable consumption and invented traffic explanations are rejected',()=>{
 assert.match(decisionIssue(ready(),{action:'visit',objective:{metric:'hunger',direction:'decrease',amount:10},reply:'Heading to the cafe'}),/eat command/);
 assert.match(decisionIssue(ready(),{action:'dismount',reply:'Traffic was heavy near the bike rack.'}),/No traffic observations/);
});
