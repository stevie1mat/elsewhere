import test from 'node:test';import assert from 'node:assert/strict';import {learningMap,examplePath,explainNode,matchesNode} from '../server/shared/learning-map.js';
test('learning map grows from recorded examples and marks actual student-to-teacher corrections',()=>{
 const e={exampleId:'a',source:'automatic_teacher',observation:{mode:'cycling',inventory:{carried:false}},studentProposal:{task:'dismount'},choice:{task:'stop'}};
 assert.deepEqual(examplePath(e),{state:'cycling',task:'stop',outcome:'blocked',correctionFrom:'dismount'});const m=learningMap([e]);assert.equal(m.counts.stop,1);assert.equal(m.states.cycling,1);assert.equal(m.outcomes.blocked,1);assert.deepEqual(m.corrections,[{from:'dismount',to:'stop',exampleId:'a'}]);assert.deepEqual(m.links,[{from:'cycling',to:'stop',count:1},{from:'stop',to:'blocked',count:1}]);
 const twice=learningMap([e,{...e,exampleId:'b'}]);assert.equal(twice.counts.stop,2);assert.equal(twice.links[0].count,2);
});
test('student-approved choices do not create imaginary correction links or phantom learned nodes',()=>{const m=learningMap([{source:'teacher_reviewed_student',choice:{task:'eat'},observation:{mode:'walking',pose:'sit',inventory:{carried:true}}}]);assert.equal(m.states.seated,1);assert.equal(m.outcomes.finished,1);assert.equal(m.corrections.length,0);assert.equal(m.counts.walk,undefined);assert.deepEqual(learningMap().links,[]);assert.deepEqual(examplePath({source:'teacher_reviewed_student',observation:{pose:'sit'},choice:{task:'eat'}}),{state:'seated',task:'eat',outcome:'finished',correctionFrom:null});});

test('every column explains actual example counts and can filter its supporting records',()=>{
 const e={source:'automatic_teacher',studentProposal:{task:'walk'},observation:{mode:'cycling'},choice:{task:'stop'}};
 assert.equal(explainNode('cycling',[e]).count,1);assert.match(explainNode('cycling',[e]).countExplanation,/1 recorded examples started/);assert.equal(matchesNode(e,'cycling'),true);assert.equal(matchesNode(e,'out:blocked'),true);assert.equal(matchesNode(e,'walk'),true);assert.equal(matchesNode(e,'sit'),false);assert.equal(explainNode('walk',[e]).count,0);assert.equal(explainNode('walk',[e]).corrections,1);assert.equal(explainNode('out:blocked',[e]).kind,'result');assert.equal(explainNode('eat',[]).count,0);
});
