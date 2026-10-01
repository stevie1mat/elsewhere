import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { QUEST_STOPS,restoreQuest,canInteract,advanceQuest } from '../src/quest.js';
import { World } from '../src/world.js';
import { canOccupy,SPAWN } from '../src/movement.js';

test('the delivery requires proximity, stopping, and the correct order; completion is permanent',()=>{
 let q=restoreQuest(null);
 assert.equal(advanceQuest(q,{...SPAWN,speed:0},'cafe'),q);
 for(const stop of QUEST_STOPS){
   const p={...stop,speed:0};
   assert.equal(canInteract(q,{...p,speed:2}),false);
   assert.equal(advanceQuest(q,p,'wrong'),q);
   const next=advanceQuest(q,p,stop.id);assert.equal(next.stage,q.stage+1);
   q=restoreQuest(JSON.parse(JSON.stringify(next)));assert.equal(q.stage,next.stage);
 }
 assert.equal(q.stage,3);assert.equal(canInteract(q,{...QUEST_STOPS[2],speed:0}),false);
 assert.equal(advanceQuest(q,{...QUEST_STOPS[2],speed:0},'pier'),q);
});
test('invalid saves cannot skip the quest',()=>{
 for(const value of [null,{stage:3},{version:1,stage:-1},{version:1,stage:4},{version:1,stage:1.5},{version:1,stage:'3'}])assert.equal(restoreQuest(value).stage,0);
});
test('all quest stops are reachable with bicycle clearance in the real neighborhood layout',()=>{
 const w=Object.create(World.prototype);
 Object.assign(w,{obstacles:[],treePositions:[],lights:[],birds:[],seed:427,scene:new T.Scene(),m:new Proxy({}, {get:()=>new T.MeshStandardMaterial()})});
 w.box=()=>{};w.cylinder=()=>{};w.sign=()=>{};w.mesh=geometry=>geometry.dispose();
 w.neighborhood();w.waterfront();w.garden();w.details();
 for(const stop of QUEST_STOPS)assert.ok(canOccupy(stop.x,stop.z,w.obstacles),`${stop.id} is clear`);
 const queue=[[SPAWN.x,SPAWN.z]],seen=new Set([`${SPAWN.x},${SPAWN.z}`]);
 for(let i=0;i<queue.length;i++){
   const [x,z]=queue[i];
   for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
     const nx=x+dx,nz=z+dz,key=`${nx},${nz}`;
     if(!seen.has(key)&&canOccupy(nx,nz,w.obstacles)&&canOccupy(x+dx*.5,z+dz*.5,w.obstacles)){seen.add(key);queue.push([nx,nz]);}
   }
 }
 for(const stop of QUEST_STOPS)assert.ok(seen.has(`${stop.x},${stop.z}`),`${stop.id} has a rideable approach`);
});
