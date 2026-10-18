import test from 'node:test';
import assert from 'node:assert/strict';
import {restoreLife,advanceLife,lifeStep,LIFE_STEPS} from '../src/settling-story.js';
const at=s=>({...lifeStep(s),speed:0,grounded:true});
test('each complete story branch awards wages once, consumes the bread and preserves choices on reload',()=>{
 for(const purchase of [0,1,2]){
  let s=restoreLife(null);
  for(let i=0;i<LIFE_STEPS.length;i++){
   const p=at(s);assert.equal(advanceLife(s,{...p,x:999},0),s);assert.equal(advanceLife(s,{...p,speed:3},0),s);assert.equal(advanceLife(s,p,99),s);
   if(i===4)assert.ok(s.items.includes('Bag of warm bread'));
   s=advanceLife(s,p,i===6?purchase:0);
   if(i===4)assert.equal(s.items.includes('Bag of warm bread'),false);
   assert.deepEqual(restoreLife(JSON.parse(JSON.stringify(s))),s);
  }
  assert.equal(s.money,[12,14,18][purchase]);assert.equal(s.complete,true);assert.equal(s.decorated,true);assert.equal(s.journal.length,11);assert.equal(s.friends.length,6);assert.ok(s.items.includes('Supper photograph'));
  assert.equal(advanceLife(s,{x:19,z:-83,speed:0},0),s);
 }
});
test('invalid saves do not invent earnings or skip chapters',()=>{
 for(const bad of [null,{version:1,stage:11,choices:[]},{version:1,stage:1,choices:[99]},{version:1,stage:-1,choices:[]},{version:1,stage:2.5,choices:[]}])assert.equal(restoreLife(bad).stage,0);
 const s=restoreLife({version:1,stage:1,choices:[0],money:999,complete:true});assert.equal(s.money,0);assert.equal(s.complete,false);
});
