import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { MumbaiWorld } from '../src/mumbai-world.js';
import { MUMBAI_SPAWN, MUMBAI_LANDMARKS } from '../src/mumbai-layout.js';
import { canOccupy,createPlayer,stepPlayer } from '../src/movement.js';

function layout(){
  const w=Object.create(MumbaiWorld.prototype);
  Object.assign(w,{obstacles:[],treePositions:[],lights:[],birds:[],seed:427,scene:new T.Scene(),m:new Proxy({}, {get:()=>new T.MeshStandardMaterial()})});
  w.box=()=>{};w.cylinder=()=>{};w.sign=()=>{};w.mesh=g=>g.dispose();
  w.ground();w.neighborhood();w.garden();w.details();return w;
}
test('Mumbai landmarks and both lane loops are reachable with full bicycle clearance',()=>{
  const w=layout();const {x,z}=MUMBAI_SPAWN;
  assert.ok(canOccupy(x,z,w.obstacles),'spawn clears parked scooters and walls');
  const queue=[[x,z]],seen=new Set([`${x},${z}`]);
  for(let i=0;i<queue.length;i++){
    const [x,z]=queue[i];
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=x+dx,nz=z+dz,key=`${nx},${nz}`;
      if(!seen.has(key)&&canOccupy(nx,nz,w.obstacles)&&canOccupy(x+dx*.5,z+dz*.5,w.obstacles)){seen.add(key);queue.push([nx,nz]);}
    }
  }
  for(const p of [...MUMBAI_LANDMARKS,{x:-65,z:-106},{x:0,z:-106},{x:-65,z:96},{x:0,z:96}])assert.ok(seen.has(`${p.x},${p.z}`),`${p.id??'loop corner'} is connected`);
  const p={...createPlayer(),...MUMBAI_SPAWN};for(let i=0;i<300;i++)stepPlayer(p,{forward:1},1/60,w.obstacles);
  assert.ok(p.z<45,'can pedal away from the church');
  assert.ok(!canOccupy(60,-36,w.obstacles),'urban boundary closes the original pier');
});

test('Mumbai architecture batches renderable geometry, including the extruded church pediment',()=>{
  const w=Object.create(MumbaiWorld.prototype),material=new T.MeshStandardMaterial();
  Object.assign(w,{obstacles:[],treePositions:[],lights:[],birds:[],cameraColliders:[],batches:new Map(),seed:427,scene:new T.Scene(),m:new Proxy({}, {get:()=>material})});
  w.sign=()=>{};w.ground();w.neighborhood();w.garden();w.details();w.bake();
  assert.ok(w.cameraColliders.length>0);
  for(const mesh of w.cameraColliders)assert.ok(mesh.geometry.attributes.position.count>0);
});
