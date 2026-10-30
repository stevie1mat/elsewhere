import test from 'node:test';import assert from 'node:assert/strict';
import {createTrainingService,createTrainingResident,trainingVerdict,truthfulReply} from '../server/training.js';
import {createResident} from '../server/resident.js';
import {createResidentBrain} from '../server/groq.js';
import {trainingScene,TRAINING_PROMPTS} from '../server/shared/training-scene.js';
import {buildCafeTable} from '../src/cafe-table.js';
const meal={action:'eat',destination:'cafe',seconds:15,goal:'Eat seated',intention:'Collect a meal and sit to eat.',reply:'I will collect food and eat seated.',changePlan:true,parameters:{value:'seated'},nextSteps:[],objective:{metric:'none',direction:'increase',amount:0,interaction:'none'}};
const blocked={no_chair:'No usable chair is available for seated eating.',no_food:'No food service is registered.',no_money:'Insufficient money; I need €4 for the meal.',blocked_route:'The route to the counter is blocked.'};
function fixture(decide=async()=>meal){let time=1000;const live=createResident(0),service=createTrainingService({getState:()=>live,decide,now:()=>time});return {live,service,async finish(){for(let i=0;i<1200;i++){time+=100;service.tick(.1);await Promise.resolve();await Promise.resolve();const s=service.snapshot();if(s.active&&['passed','failed','correctly_blocked','cancelled','interrupted'].includes(s.active.status))return s;}throw Error('Trial did not finish');}};}
test('normal trial verifies the full task through the real executor without touching the saved resident',async()=>{
 const f=fixture();const before=JSON.stringify({player:f.live.player,arrival:f.live.arrival,wallet:f.live.wallet,events:f.live.events});f.service.start();const result=await f.finish();
 assert.equal(result.active.status,'passed');assert.ok(Object.values(result.active.evidence).every(Boolean));assert.equal(result.active.final.money,16);assert.ok(result.active.final.hunger<80);assert.equal(result.active.decisions.length,1);assert.equal(result.skills.length,0);
 assert.equal(JSON.stringify({player:f.live.player,arrival:f.live.arrival,wallet:f.live.wallet,events:f.live.events}),before);
});
test('failure cases require the correct explanation and never invent consumption',async()=>{
 for(const [scenario,reply] of Object.entries(blocked)){const f=fixture(async()=>({...meal,action:'stop',destination:'here',reply,parameters:{},objective:{metric:'none',direction:'increase',amount:0,interaction:'none'}}));f.service.start({scenario});const result=await f.finish();assert.equal(result.active.status,'correctly_blocked',scenario);assert.equal(result.active.verdict.taskCompleted,false);assert.equal(result.active.evidence.seatedEating,false);assert.equal(result.skills.length,0);}
});
test('a plausible but wrong diagnosis and false seated claims fail instead of training a skill',async()=>{
 const f=fixture(async()=>({...meal,action:'stop',destination:'here',reply:'No food service is registered.'}));f.service.start({scenario:'no_chair'});assert.equal((await f.finish()).active.status,'failed');
 const s=createTrainingResident('normal');assert.equal(truthfulReply("I'm seated and eating.",s),false);assert.equal(truthfulReply('I will sit down and eat.',s),true);
 const run={state:s,baseline:{hunger:90,money:20},evidence:{parked:true,collected:true,seatedEating:true,hungerReduced:true,finishedMeal:true},decisions:[{reply:"I'm seated",truthful:false}]};assert.equal(trainingVerdict(run).status,'failed');
});
test('verified skill requires three actual wording variants plus all four safety scenarios',async()=>{
 let scenario='normal';const f=fixture(async()=>scenario==='normal'?meal:{...meal,action:'stop',destination:'here',reply:blocked[scenario],parameters:{}});
 for(let i=0;i<3;i++){f.service.start({promptIndex:i});await f.finish();}assert.equal(f.service.snapshot().skills.length,0);
 for(const id of Object.keys(blocked)){scenario=id;f.service.start({scenario});await f.finish();}
 assert.equal(f.service.snapshot().skills.length,1);const skill=f.service.snapshot().skills[0];assert.equal(skill.safetyCases,4);assert.equal(skill.steps[0].action,'eat');
 f.service.start({mode:'skill'});assert.equal((await f.finish()).active.status,'passed');
});
test('cancel ignores late model output and never awards a success or skill',async()=>{
 let resolve;const f=fixture(()=>new Promise(r=>resolve=r));f.service.start();f.service.tick(.1);assert.ok(f.service.busy);f.service.cancel();resolve(meal);await Promise.resolve();await Promise.resolve();assert.equal(f.service.snapshot().active.status,'cancelled');assert.equal(f.service.snapshot().reports.length,1);assert.equal(f.service.snapshot().skills.length,0);
});
test('scene furniture shares the exact city asset builder and excludes city buildings',()=>{
 const registry=[],w={m:{},box(){},cylinder(){},obstacle(){},interactionObjects:registry};buildCafeTable(w,30,16);const scene=trainingScene();assert.deepEqual(registry,scene.objects.filter(o=>o.type==='chair'));assert.equal(scene.objects.filter(o=>o.type==='food').length,1);assert.equal(trainingScene('no_chair').objects.some(o=>o.type==='chair'),false);
});
test('training bypasses phrase shortcuts and uses the model, with a restricted practice context',async()=>{
 let calls=0;const brain=createResidentBrain({client:{configured:true,provider:'test',model:'test',complete:async(context,message)=>{calls++;assert.equal(context.trainingLab,true);assert.deepEqual(context.places.map(p=>p.id),['cafe']);assert.ok(!context.capabilities.includes('enter_skyway'));assert.equal(context.commands.npcs.length,0);return meal;}},now:()=>1000});
 const s=createTrainingResident('normal');await brain.trainingDecision(s,TRAINING_PROMPTS[1]);assert.equal(calls,1);assert.equal(s.player.mode,'cycling','planning alone does not execute a phrase shortcut');brain.stop();
});
test('invalid model proposals fail without silent automatic repair or fabricated successful attempts',async()=>{
 let calls=0;const brain=createResidentBrain({client:{configured:true,complete:async()=>{calls++;return {...meal,action:'visit',objective:{metric:'hunger',direction:'decrease',amount:10,interaction:'none'}};}},now:()=>1000});
 const s=createTrainingResident('normal');await assert.rejects(brain.trainingDecision(s,TRAINING_PROMPTS[0]),/Training proposal rejected/);assert.equal(calls,1);assert.equal(s.trainingProposal.decision.action,'visit');brain.stop();
});
test('stalled visit returns measured feedback promptly and lets the planner correct itself',async()=>{
 let calls=0;const f=fixture(async(s,message)=>{calls++;assert.match(message,/parameters.value=seated/);if(calls===1)return {...meal,action:'visit',seconds:60,objective:{metric:'none',direction:'increase',amount:0,interaction:'none'}};assert.match(s.executionFeedback.at(-1).message,/No task progress/);return meal;});
 f.service.start();const result=await f.finish();assert.equal(result.active.status,'passed');assert.equal(calls,2);assert.equal(result.active.decisions[0].noProgress,true);assert.equal(result.active.decisions[0].command.action,'visit');assert.ok(result.active.elapsed<60);assert.equal(result.active.decisions[1].command.action,'eat');
});
test('rejected model proposal stays in the report and is corrected by a new model decision',async()=>{
 let calls=0,time=1000;const live=createResident(0);const brain=createResidentBrain({client:{configured:true,complete:async(context)=>{calls++;assert.equal(context.trainingCommands.eat.parameters.value,'seated');if(calls===1)return {...meal,action:'visit',objective:{metric:'hunger',direction:'decrease',amount:10,interaction:'none'}};assert.match(context.executionFeedback.at(-1).message,/requires an eat command/);return meal;}},now:()=>time});
 const service=createTrainingService({getState:()=>live,decide:(s,m)=>brain.trainingDecision(s,m),now:()=>time});service.start();for(let i=0;i<1500&&service.busy;i++){time+=100;service.tick(.1);for(let j=0;j<12;j++)await Promise.resolve();}
 const result=service.snapshot();assert.equal(result.active.status,'passed');assert.equal(calls,2);assert.equal(result.active.decisions.length,2);assert.equal(result.active.decisions[0].executed,false);assert.match(result.active.decisions[0].error,/requires an eat command/);assert.equal(result.active.decisions[1].executed,true);brain.stop();
});
test('repeated invalid proposals stop at the trial command limit without awarding success',async()=>{
 const f=fixture(async(s)=>{s.trainingProposal={decision:meal,issue:'Invalid proposal'};const e=new Error('Invalid proposal');e.kind='decision';throw e;});f.service.start();const result=await f.finish();assert.equal(result.active.status,'failed');assert.equal(result.active.decisions.length,5);assert.equal(result.skills.length,0);
});
test('starting during a long connection cooldown waits and retries without recording an interruption',async()=>{
 let time=1000,calls=0;const live=createResident(0),service=createTrainingService({getState:()=>live,now:()=>time,decide:async()=>{calls++;if(calls===1){const e=new Error('AI connection is cooling down. Retrying in 33 seconds.');e.status=429;e.retryMs=33000;throw e;}return meal;}});
 service.start();service.tick(.1);for(let i=0;i<6;i++)await Promise.resolve();assert.equal(service.snapshot().active.status,'waiting');assert.equal(service.snapshot().reports.length,0);assert.match(service.snapshot().active.waitReason,/33 seconds/);time+=32000;service.tick(.1);assert.equal(calls,1);time+=1000;
 for(let i=0;i<1200&&service.busy;i++){time+=100;service.tick(.1);for(let j=0;j<6;j++)await Promise.resolve();}
 assert.equal(calls,2);assert.equal(service.snapshot().active.status,'passed');assert.equal(service.snapshot().reports.length,1);
});
