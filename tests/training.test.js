import test from 'node:test';import assert from 'node:assert/strict';
import {createTrainingService,createTrainingResident,truthfulReply} from '../server/training.js';
import {applyTrainingAction} from '../server/training-actions.js';
import {trainingChoiceDecision as choice} from '../server/training-choice.js';
import {createResident} from '../server/resident.js';
const command=(task,target='',reply='I will try this action.')=>choice({task,target,reply});
const sequence=()=>[command('dismount'),command('walk','cafe-meal'),command('purchase_meal'),command('collect_meal'),command('walk','chair:30:16:-1.2'),command('sit','chair:30:16:-1.2'),command('eat')];
function fixture(decide){let time=1000;const live=createResident(0);const queue=sequence();const service=createTrainingService({getState:()=>live,decide:decide||(async()=>queue.shift()||command('stop')),now:()=>time});return {live,service,async finish(){for(let i=0;i<2000;i++){time+=100;service.tick(.1);for(let j=0;j<8;j++)await Promise.resolve();const s=service.snapshot();if(s.active&&['passed','failed','correctly_blocked','cancelled','interrupted'].includes(s.active.status))return s;}throw Error('Trial did not finish');}};}
test('atomic actions complete real physics only through separate model decisions, with isolated live state',async()=>{
 const f=fixture(),before=JSON.stringify(f.live);f.service.start();const s=await f.finish();assert.equal(s.active.status,'passed');assert.equal(s.active.decisions.length,7);assert.equal(s.active.final.money,16);assert.ok(Object.values(s.active.evidence).every(Boolean));assert.equal(JSON.stringify(f.live.player),JSON.stringify(JSON.parse(before).player));assert.equal(f.live.wallet,JSON.parse(before).wallet);assert.equal(s.active.protocol,'atomic-v1');
});
test('purchase, collection, sitting and eating cannot silently perform each other',()=>{
 const s=createTrainingResident('normal');assert.match(applyTrainingAction(s,command('walk','cafe-meal'),1000).error,/on foot/);assert.match(applyTrainingAction(s,command('eat'),1000).error,/inventory/);
 applyTrainingAction(s,command('dismount'),1000);assert.match(applyTrainingAction(s,command('purchase_meal'),1000).error,/reach/);Object.assign(s.player,{x:35,z:12});assert.match(applyTrainingAction(s,command('collect_meal'),1000).error,/paid/);
 applyTrainingAction(s,command('purchase_meal'),1000);assert.equal(s.wallet,16);assert.equal(s.player.carriedMeal,undefined);assert.equal(s.player.interactionPose,undefined);assert.equal(s.needs.hunger,90);assert.match(applyTrainingAction(s,command('purchase_meal'),1000).error,/second charge/);
 applyTrainingAction(s,command('collect_meal'),1000);assert.equal(s.player.carriedMeal,true);assert.equal(s.player.interactionPose,undefined);assert.equal(s.player.consuming,undefined);assert.match(applyTrainingAction(s,command('sit','chair:30:16:-1.2'),1000).error,/reach/);
 assert.match(applyTrainingAction(s,{...command('eat'),parameters:{value:'seated'}},1000).error,/shortcuts/);
});
test('failure feedback reaches the next choice and failed attempts remain visible',async()=>{
 const queue=[command('eat'),...sequence()];let calls=0;const f=fixture(async s=>{if(++calls===2)assert.match(s.executionFeedback.at(-1).message,/inventory/);return queue.shift();});f.service.start();const s=await f.finish();assert.equal(s.active.status,'passed');assert.equal(s.active.decisions[0].executed,false);assert.equal(s.active.decisions.length,8);assert.ok(s.active.decisions[1].after);
});
test('missing requirements require accurate explanations and never award food completion',async()=>{
 const blockers={no_chair:'No usable chair is available.',no_food:'No food service is available.',no_money:'Insufficient money: I need €4.',blocked_route:'The route to the counter is blocked.'};
 for(const [scenario,reply]of Object.entries(blockers)){const f=fixture(async()=>command('stop','',reply));f.service.start({scenario});const s=await f.finish();assert.equal(s.active.status,'correctly_blocked');assert.equal(s.active.evidence.finishedMeal,false);}
 const f=fixture(async()=>command('stop','','No food service is available.'));f.service.start({scenario:'no_chair'});assert.equal((await f.finish()).active.status,'failed');
});
test('instant dismount is observed and unsupported completion replies fail',async()=>{
 const q=[command('dismount'),command('stop')],f=fixture(async()=>q.shift());f.service.start();assert.equal((await f.finish()).active.evidence.parked,true);assert.equal(truthfulReply('Bike parked.',createTrainingResident('normal')),false);
});
test('legacy shortcut passes cannot promote an atomic skill',async()=>{
 const f=fixture();f.live.training={reports:[0,1,2].map(i=>({mode:'planner',status:'passed',prompt:'variant '+i,decisions:[]})),skills:[]};f.service.start();await f.finish();assert.equal(f.service.snapshot().skills.length,0);assert.throws(()=>f.service.start({mode:'skill'}),/No verified skill/);
});
test('atomic skill promotion requires variants and all safety cases, and replay stays separate',async()=>{
 const live=createResident(0);let time=1000,queue=[];const service=createTrainingService({getState:()=>live,now:()=>time,decide:async()=>queue.shift()});
 async function run(options){service.start(options);for(let i=0;i<2000&&service.busy;i++){time+=100;service.tick(.1);for(let j=0;j<8;j++)await Promise.resolve();}return service.snapshot();}
 for(let promptIndex=0;promptIndex<3;promptIndex++){queue=sequence();assert.equal((await run({promptIndex})).active.status,'passed');}
 assert.equal(service.snapshot().skills.length,0);
 for(const [scenario,reply]of Object.entries({no_chair:'No chair is available.',no_food:'No food service is available.',no_money:'Insufficient money.',blocked_route:'The route is blocked.'})){queue=[command('stop','',reply)];await run({scenario});}
 assert.equal(service.snapshot().skills.length,1);assert.equal(service.snapshot().skills[0].steps.length,7);assert.equal((await run({mode:'skill'})).active.status,'passed');
});
test('cancel ignores late output and cooldown waits without recording interrupted failure',async()=>{
 let resolve;const f=fixture(()=>new Promise(r=>resolve=r));f.service.start();f.service.tick(.1);f.service.cancel();resolve(command('dismount'));for(let i=0;i<8;i++)await Promise.resolve();assert.equal(f.service.snapshot().active.status,'cancelled');
 let calls=0;const q=sequence();const g=fixture(async()=>{if(++calls===1){const e=new Error('Cooldown');e.status=429;e.retryMs=33000;throw e;}return q.shift();});g.service.start();assert.equal((await g.finish()).active.status,'passed');
});
test('moved furniture uses current registry targets, not memorized coordinates',async()=>{
 const q=sequence().map(c=>c.objectId.startsWith('chair:')?{...c,objectId:'chair:34:16:-1.2'}:c),f=fixture(async()=>q.shift());f.service.start({scenario:'moved_objects'});const s=await f.finish();assert.equal(s.active.status,'passed');assert.equal(s.active.scene.objects.find(o=>o.id==='cafe-meal').x,29);
});
test('blocked route cannot be bypassed by purchasing from a distance',()=>{
 const s=createTrainingResident('blocked_route');applyTrainingAction(s,command('dismount'),1000);assert.ok(applyTrainingAction(s,command('walk','cafe-meal'),1000).error);assert.ok(applyTrainingAction(s,command('purchase_meal'),1000).error);assert.equal(s.wallet,20);assert.equal(s.player.carriedMeal,undefined);
});
test('walking to an already reached target reports no progress instead of another successful move',()=>{
 const s=createTrainingResident('normal');applyTrainingAction(s,command('dismount'),1000);Object.assign(s.player,{x:35,z:12});assert.match(applyTrainingAction(s,command('walk','cafe-meal'),1000).error,/No progress: already at/);assert.equal(s.wallet,20);assert.equal(s.player.carriedMeal,undefined);
});
test('interactive teacher executes one observed action at a time and exports only verified demonstrations',async()=>{
 let time=1000;const live=createResident(0);let modelCalls=0;const service=createTrainingService({getState:()=>live,now:()=>time,decide:async()=>{modelCalls++;throw Error('Teacher must not call student');}});
 service.start({mode:'teacher'});service.tick(.1);const id=service.snapshot().active.id;
 for(const c of sequence()){
  const a=service.snapshot().active;assert.equal(a.status,'awaiting_teacher');assert.throws(()=>service.teacherStep({trialId:'old',expectedDecisions:a.decisions.length,choice:{task:'inspect',target:'',reply:'Inspect.'}}),/Stale/);
  service.teacherStep({trialId:id,expectedDecisions:a.decisions.length,choice:{task:c.plannerTask,target:c.objectId,reply:c.reply}});
  for(let i=0;i<500;i++){time+=100;service.tick(.1);await Promise.resolve();const status=service.snapshot().active.status;if(['awaiting_teacher','passed','failed'].includes(status))break;}
 }
 const s=service.snapshot();assert.equal(s.active.status,'passed');assert.equal(modelCalls,0);assert.equal(s.skills.length,0,'teacher demonstration does not count as student learning');const dataset=service.export();assert.equal(dataset.teacherExamples.length,7);assert.equal(dataset.weightsUpdated,false);assert.equal(dataset.teacherExamples.at(-1).choice.task,'eat');assert.ok(dataset.teacherExamples.at(-1).result.hunger<80);
});
