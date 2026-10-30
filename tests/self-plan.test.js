import test from 'node:test';
import assert from 'node:assert/strict';
import {installPlan,nextPlanStep,invalidatePlan} from '../server/self-plan.js';
import {createResident,stepResident} from '../server/resident.js';
import {createResidentBrain,validateDecision} from '../server/groq.js';
const plan={action:'rest',destination:'garden',seconds:60,intention:'Think about what to do.',goal:'Find a quiet place I enjoy.',reply:'I will try a walk.',changePlan:true,successCriterion:'Visit a different park and compare how I feel.',nextSteps:[{action:'visit',destination:'palms',seconds:60,intention:'Try another park.',condition:{need:'energy',min:30,max:100}}]};
test('a model-written plan persists and checks its own next-step condition',()=>{
 const s=createResident();s.needs={energy:60};installPlan(s,plan,1000);const restored=JSON.parse(JSON.stringify(s));
 assert.equal(nextPlanStep(restored).destination,'palms');assert.equal(restored.script.cursor,2);assert.equal(nextPlanStep(restored),null);assert.equal(restored.script.status,'completed');
 s.needs.energy=10;assert.equal(nextPlanStep(s),null);assert.equal(s.script.status,'needs_revision');assert.match(s.script.reason,/energy/);
});
test('the next authored step executes without another model request',async()=>{
 let time=1000,calls=0;const s=createResident();s.obstacles=[];s.arrival.phase='landed';
 const brain=createResidentBrain({client:{configured:true,model:'test',complete:async()=>{calls++;return plan;}},now:()=>time});brain.initialize(s);
 await brain.update(s);stepResident(s,.1,time);for(let i=0;i<61;i++)stepResident(s,1,time+i*1000);
 time=100000;await brain.update(s);assert.equal(calls,1);assert.equal(s.pendingDecision.destination,'palms');assert.equal(s.ai.planStepsReused,1);brain.stop();
});
test('invalid plans cannot add actions outside the game action API',()=>{
 assert.deepEqual(validateDecision(plan).nextSteps,plan.nextSteps);
 assert.throws(()=>validateDecision({...plan,nextSteps:[{...plan.nextSteps[0],action:'run_shell'}]}));
 assert.throws(()=>validateDecision({...plan,nextSteps:[{...plan.nextSteps[0],condition:{need:'energy',min:80,max:20}}]}));
 const s=createResident();installPlan(s,plan,1);invalidatePlan(s,'blocked road');assert.equal(nextPlanStep(s),null);assert.equal(s.script.reason,'blocked road');
});
