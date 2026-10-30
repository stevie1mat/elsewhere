import test from 'node:test';
import assert from 'node:assert/strict';
import {progressSummary,relevantLessons} from '../server/learning-progress.js';
import {learnOutcome} from '../server/cognition.js';
import {createResident,stepResident} from '../server/resident.js';
import {ensureMind} from '../server/resident-mind.js';
import {residentContext} from '../server/groq.js';
const person=()=>{const s=createResident();s.obstacles=[];s.arrival.phase='landed';ensureMind(s);return s;};
function outcome(s,energyBefore,energyAfter,at){s.needs.energy=energyAfter;return learnOutcome(s,{kind:'rest',place:'Park bench',before:{needs:{...s.needs,energy:energyBefore},money:s.wallet}},at);}
test('empty score is unknown; neutral, beneficial and harmful outcomes have transparent scores',()=>{
 assert.equal(progressSummary(person()).score,null);
 for(const [reward,expected] of [[0,50],[1,100],[-1,0]])assert.equal(progressSummary({outcomes:[{reward}]}).score,expected);
});
test('rolling score falls as harmful outcomes replace useful ones, with fixed-window comparison',()=>{
 const s={learningProgress:{history:Array.from({length:20},(_,i)=>({reward:i<10?.4:-.2,sequence:i+1}))}};
 const p=progressSummary(s);assert.equal(p.score,40);assert.equal(p.change,-30);assert.equal(p.samples,10);
 assert.equal(progressSummary({outcomes:s.learningProgress.history.slice(0,19)}).change,null);
});
test('outcomes persist a bounded graph history beyond the 12 detailed records and survive restore',()=>{
 const s=person();for(let i=0;i<350;i++)outcome(s,20,50,i);
 assert.equal(s.outcomes.length,12);assert.equal(s.learningProgress.history.length,300);assert.equal(s.learningProgress.history[0].sequence,51);assert.equal(s.learningProgress.history.at(-1).sequence,350);
 assert.deepEqual(progressSummary(JSON.parse(JSON.stringify(s))),progressSummary(s));
});
test('migration uses only retained evidence and creates no fabricated missing points',()=>{
 const s=person();s.learning={totalOutcomes:26,preferences:{}};s.outcomes=[{at:1,reward:.1,activity:'observe',place:'garden'},{at:2,reward:0,activity:'rest',place:'garden'}];
 assert.deepEqual(progressSummary(s).history.map(p=>p.sequence),[25,26]);outcome(s,10,30,3);
 assert.deepEqual(progressSummary(s).history.map(p=>p.sequence),[25,26,27]);
});
test('lessons distinguish resting with high energy from resting when tired and reach model context',()=>{
 const s=person();outcome(s,99,100,1);outcome(s,99,100,2);s.needs.energy=99;
 assert.equal(relevantLessons(s)[0].condition,'energy 75–99');assert.equal(relevantLessons(s)[0].trials,2);
 outcome(s,10,50,3);s.needs.energy=10;const lesson=relevantLessons(s)[0];assert.equal(lesson.condition,'energy 0–24');assert.equal(lesson.trials,1);assert.ok(lesson.meanOutcome>0);
 assert.equal(residentContext(s).lessonsForCurrentNeeds[0].condition,'energy 0–24');
});
test('paused and disconnected simulation creates no new score points',()=>{
 const s=person();outcome(s,20,30,1);const before=JSON.stringify(progressSummary(s));s.paused=true;stepResident(s,100,2);assert.equal(JSON.stringify(progressSummary(s)),before);
 s.paused=false;s.ai={connected:false};stepResident(s,100,3);assert.equal(JSON.stringify(progressSummary(s)),before);
});
