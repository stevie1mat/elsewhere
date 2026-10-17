import test from 'node:test';
import assert from 'node:assert/strict';
import {Locomotion} from '../src/locomotion.js';
const player=()=>({mode:'walking',speed:4.8,walked:0,grounded:true});
test('running does not chatter around the old speed threshold',()=>{
 const gait=new Locomotion(),p=player();gait.update(p,.05);
 for(let i=0;i<100;i++){p.speed=i%2?2.59:2.61;p.walked+=.04;gait.update(p,1/60);assert.equal(gait.running,true);}
 p.speed=2;gait.update(p,.05);assert.equal(gait.running,false);
});
test('running jumps preserve the pose, and remount/reset corrections do not skip strides',()=>{
 const gait=new Locomotion(),p=player();gait.update(p,.05);p.walked=.1;gait.update(p,.05);
 const phase=gait.phase;p.grounded=false;p.walked=.3;gait.update(p,.05);assert.equal(gait.phase,phase);assert.equal(gait.running,true);
 p.grounded=true;p.walked=100;gait.update(p,.05);assert.equal(gait.phase,phase);
 p.mode='cycling';p.walked=150;gait.update(p,.05);p.mode='walking';p.walked+=.1;gait.update(p,.05);assert.ok(Math.abs(gait.phase-phase)<.1);
});
