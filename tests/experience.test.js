import test from 'node:test';
import assert from 'node:assert/strict';
import {createResident,applyResidentDecision,stepResident} from '../server/resident.js';
import {ensureMind} from '../server/resident-mind.js';
import {retrieveEffects,needAwareness} from '../server/experience.js';
import {installPlan} from '../server/self-plan.js';
import {validateDecision,residentContext} from '../server/groq.js';
const person=()=>{const s=createResident();s.obstacles=[];s.arrival.phase='landed';s.ai={enabled:true,connected:true};s.player.x=40;s.player.z=7;ensureMind(s);s.objects=[{id:'seat',name:'Bench',type:'bench',x:40,y:.59,z:10,yaw:0,approach:{x:40,z:8.7},affordances:['sit']}];return s;};
const decision={action:'interact',objectId:'seat',verb:'sit',destination:'garden',goal:'Gain 10 energy while sitting',seconds:120,intention:'Recover energy on a seat',reply:'I will try the seat.',objective:{metric:'energy',direction:'increase',amount:10,interaction:'sit'}};
test('negative combined reward does not erase successful energy recovery evidence',()=>{
 const s=person();s.outcomes=[{activity:'rest',place:'Bench',at:1,reward:-.02,before:{energy:71,thirst:84},after:{energy:87,thirst:87},duration:120,executionMode:'object_interaction'}];
 const effects=retrieveEffects(s);assert.equal(effects[0].meanChanges.energy,16);assert.equal(effects[0].meanChanges.thirst,3);assert.equal(retrieveEffects(s)[0].trials,1);assert.equal(effects[0].lastExample.before.energy,71);
 const restored=JSON.parse(JSON.stringify(s));assert.equal(retrieveEffects(restored)[0].meanChanges.energy,16);assert.equal(residentContext(s).mechanics.rest.energyPerSecond,.132);
});
test('numeric seat task is verified from original baseline after actual pose and recovery; report occurs once',()=>{
 const s=person();s.needs.energy=71;applyResidentDecision(s,decision,0);installPlan(s,decision,0);assert.equal(s.task.target,81);
 for(let i=0;i<1500;i++)stepResident(s,.1,i*100);assert.equal(s.task.status,'achieved');assert.equal(s.task.interactionVerified,true);assert.ok(s.task.current>=81);assert.equal(s.messages.filter(m=>m.source==='task verifier').length,1);assert.equal(s.actionEffects['rest|Bench'].trials,1);
 const restored=JSON.parse(JSON.stringify(s));assert.equal(restored.task.status,'achieved');
});
test('working cannot pass an energy target just by earning money; failed effect triggers replanning',async()=>{
 const {learnOutcome}=await import('../server/cognition.js');const s=person();s.needs.energy=60;installPlan(s,decision,0);s.needs.energy=50;s.wallet+=8;
 learnOutcome(s,{kind:'work',place:'Cafe',before:{needs:{...s.needs,energy:60},money:s.wallet-8}},1000);
 assert.equal(s.task.status,'active');assert.equal(s.task.lastAttemptHelped,false);assert.equal(s.script.status,'needs_revision');assert.equal(s.messages,undefined);
 installPlan(s,decision,2000);assert.equal(s.task.baseline,60);assert.equal(s.task.target,70);
});
test('impossible target is explicit, pauses freeze task evidence, and missing needs do not invent asset requests',()=>{
 const s=person();s.needs.energy=95;installPlan(s,decision,0);assert.equal(s.task.status,'blocked');s.needs.thirst=90;assert.equal(needAwareness(s).unresolved[0].metric,'thirst');assert.equal(s.worldRequests,undefined);
 s.paused=true;const before=JSON.stringify(s.task);stepResident(s,100,1000);assert.equal(JSON.stringify(s.task),before);
});
test('objective schema rejects impossible formats and no-objective legacy decisions remain valid',()=>{
 assert.throws(()=>validateDecision({...decision,objective:{...decision.objective,amount:1000}}));assert.equal(validateDecision(decision).objective.amount,10);
 const {objective,...legacy}=decision;assert.equal(validateDecision(legacy).objective,undefined);
});
test('contradictory sit promise triggers one model repair before applying a chat action',async()=>{
 const {createResidentBrain}=await import('../server/groq.js');const s=person();let calls=0;
 const client={configured:true,model:'test',complete:async()=>{calls++;return calls===1?{...decision,action:'rest',changePlan:true}:{...decision,changePlan:true};}};
 const brain=createResidentBrain({client});brain.initialize(s);await brain.chat(s,'Raise energy by 10 while sitting');assert.equal(calls,2);assert.equal(s.pendingInteraction.verb,'sit');assert.equal(s.task.target,s.task.baseline+10);brain.stop();
});
test('repair cannot silently lower the requested target and repeated bad commands do not execute',async()=>{
 const {createResidentBrain}=await import('../server/groq.js');const s=person();let calls=0;const client={configured:true,model:'test',complete:async()=>{calls++;return {...decision,changePlan:true,...(calls===1?{action:'rest'}:{objective:{...decision.objective,amount:1}})};}};
 const brain=createResidentBrain({client});brain.initialize(s);await assert.rejects(brain.chat(s,'Raise energy by 10 while sitting'),/changed the requested objective/);assert.equal(s.pendingInteraction,undefined);assert.equal(s.task,undefined);brain.stop();
});
test('repair may correct an impossible AI-authored phone objective without changing a human target',async()=>{
 const {createResidentBrain}=await import('../server/groq.js');const s=person();let calls=0,repair;
 const phone={action:'phone',destination:'here',seconds:60,goal:'Explore music',intention:'Search for music',reply:'I will search for music.',mediaQuery:'calm music',changePlan:true,nextSteps:[],objective:{metric:'thirst',direction:'decrease',amount:10,interaction:'none'}};
 const client={configured:true,model:'test',complete:async(c,m)=>{calls++;if(calls===1)return phone;repair=m;return {...phone,objective:{metric:'none',direction:'increase',amount:0,interaction:'none'}};}};
 const brain=createResidentBrain({client});brain.initialize(s);await brain.chat(s,'Choose an activity you want to do.');
 assert.equal(calls,2);assert.match(repair,/Correct the impossible objective too/);assert.equal(s.activity.kind,'phone');assert.equal(s.ai.connected,true);brain.stop();
});
test('rejected plans preserve provider connection evidence and retry without quota backoff',async()=>{
 const {createResidentBrain}=await import('../server/groq.js');const s=person();
 const phone={action:'phone',destination:'here',seconds:60,goal:'Recover energy',intention:'Search for music',reply:'Searching.',mediaQuery:'calm music',changePlan:true,nextSteps:[],objective:{metric:'energy',direction:'increase',amount:10,interaction:'none'}};
 const attempt={provider:'Mac LM Studio',at:1000,status:'success',usage:{input:10,output:5,total:15},received:{content:JSON.stringify(phone)}};
 const client={configured:true,model:'test',provider:'Mac LM Studio',diagnostics:[{provider:'Mac LM Studio',status:'connected'}],lastAttempt:attempt,complete:async()=>({...phone})};
 const brain=createResidentBrain({client,now:()=>1000});brain.initialize(s);await assert.rejects(brain.chat(s,'Choose an activity'),/Phone use cannot/);
 assert.equal(s.ai.connected,false);assert.equal(s.ai.failureKind,'decision');assert.equal(s.ai.retryAt,31000);assert.equal(s.ai.providerHealth[0].status,'connected');assert.match(s.ai.telemetry.lastRejectedDecision.error,/Decision rejected/);assert.match(residentContext(s).lastRejectedPlan.reason,/Phone use cannot/);brain.stop();
});
